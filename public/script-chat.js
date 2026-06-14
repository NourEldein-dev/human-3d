// ===== CHAT SYSTEM VARIABLES =====
let currentQuestion = 0;
let userAnswers = [];
let activePart = null;
let chatActive = false;
let isUsingGemini = false;
let geminiChatHistory = [];
let currentNodeKey = null;

function normalizeKey(key) {
    if (!key) return "";
    return key.toLowerCase().replace(/[\s_-]/g, "");
}

// ===== DECISION TREE CONFIGURATION =====
function getArmTree(sideTextEn, sideTextAr) {
    return {
        start: "arm_cause",
        nodes: {
            "arm_cause": {
                question: `ما هو السبب الرئيسي لألم الذراع ${sideTextAr}؟`,
                options: [
                    { text: "إصابة أو سقوط", next: "arm_injury_severity" },
                    { text: "بدون إصابة واضحة", next: "arm_pain_type" }
                ]
            },
            "arm_injury_severity": {
                question: `هل هناك تورم شديد، احمرار، أو عدم قدرة على تحريك الذراع ${sideTextAr} نهائياً؟`,
                options: [
                    { text: "نعم", diagnosis: { ar: `اشتباه بكسر أو خلع في مفصل الذراع ${sideTextAr}. يجب التوجه للمستشفى فوراً لعمل أشعة سينية وتثبيت الذراع.`, severity: "high" } },
                    { text: "لا", diagnosis: { ar: `كدمة أو التواء بسيط في الذراع ${sideTextAr}. ينصح بوضع كمادات باردة/ثلج، رفع الذراع، وتجنب تحريكها.`, severity: "medium" } }
                ]
            },
            "arm_pain_type": {
                question: `هل تشعر بتنميل ووخز يمتد للأصابع في الذراع ${sideTextAr} أم ألم في المفاصل؟`,
                options: [
                    { text: "تنميل ووخز", next: "arm_nerve_check" },
                    { text: "ألم مفاصل", diagnosis: { ar: `التهاب أوتار أو مفاصل في الذراع ${sideTextAr} (مثل الكتف أو المرفق). ينصح بالراحة ومسكنات بسيطة موضعية.`, severity: "low" } }
                ]
            },
            "arm_nerve_check": {
                question: "هل يزداد التنميل مع ثني الرسغ أو أثناء النوم؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "متلازمة النفق الرسغي (Carpal Tunnel) أو انضغاط عصبي في الرقبة. ينصح بارتداء دعامة وتجنب الحركات المتكررة لليد.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "مشكلة عصبية بسيطة أو ضعف تروية مؤقت. يوصى بعمل تمارين إطالة خفيفة ومراجعة الطبيب إذا استمر.", severity: "low" } }
                ]
            }
        }
    };
}

function getLegTree(sideTextEn, sideTextAr) {
    return {
        start: "leg_cause",
        nodes: {
            "leg_cause": {
                question: `هل حدثت إصابة مباشرة أو سقوط مؤخراً في الساق ${sideTextAr}؟`,
                options: [
                    { text: "نعم", next: "leg_injury_check" },
                    { text: "لا", next: "leg_non_injury_type" }
                ]
            },
            "leg_injury_check": {
                question: `هل هناك عدم قدرة تامة على تحمل الوزن أو المشي، أو تشوه في شكل الساق ${sideTextAr}؟`,
                options: [
                    { text: "نعم", diagnosis: { ar: `اشتباه بكسر في عظام الساق ${sideTextAr} أو تمزق شديد بالأربطة. يرجى التوجه للطوارئ لعمل الأشعة اللازمة.`, severity: "high" } },
                    { text: "لا", diagnosis: { ar: `التواء بسيط أو كدمة عضلية في الساق ${sideTextAr}. ينصح باتباع بروتوكول الراحة، الثلج، والضغط، والرفع (RICE).`, severity: "medium" } }
                ]
            },
            "leg_non_injury_type": {
                question: `هل الألم عبارة عن تورم واحمرار دافئ في بطة الساق ${sideTextAr} أم شد عضلي مفاجئ؟`,
                options: [
                    { text: "تورم واحمرار دافئ", diagnosis: { ar: `اشتباه بجلطة ساق عميقة (DVT) في الساق ${sideTextAr}. يرجى الذهاب إلى الطوارئ فوراً لإجراء فحص سونار على أوردة الساق وعدم تدليك المنطقة إطلاقاً.`, severity: "high" } },
                    { text: "شد عضلي مفاجئ", next: "leg_cramp_check" }
                ]
            },
            "leg_cramp_check": {
                question: "هل يحدث الألم غالباً أثناء النوم أو بعد تمرين مجهد؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "تشنج عضلي ناتج عن الجفاف أو نقص البوتاسيوم/المغنيسيوم. ينصح بشرب كميات كافية من الماء وعمل إطالة خفيفة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "إجهاد عضلي عام أو إرهاق. ينصح بالراحة وحمامات دافئة للساق.", severity: "low" } }
                ]
            }
        }
    };
}

const decisionTrees = {
    "head": {
        start: "head_type",
        nodes: {
            "head_type": {
                question: "هل الألم مستمر أم يأتي على فترات؟",
                options: [
                    { text: "مستمر", next: "head_continuous_severity" },
                    { text: "متقطع", next: "head_intermittent_type" }
                ]
            },
            "head_continuous_severity": {
                question: "هل الألم حاد وشديد أم ضاغط وخفيف؟",
                options: [
                    { text: "حاد وشديد", next: "head_severe_symptoms" },
                    { text: "ضاغط وخفيف", next: "head_tension_symptoms" }
                ]
            },
            "head_severe_symptoms": {
                question: "هل يصاحب الألم غثيان، زغللة في العين أو دوخة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "صداع نصفي شديد (الشقيقة) أو صداع عنقودي. ينصح بزيارة الطبيب لتقييم الحالة ووصف العلاج المناسب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "صداع ناتج عن الإجهاد أو ارتفاع ضغط الدم. يفضل فحص ضغط الدم والراحة.", severity: "medium" } }
                ]
            },
            "head_tension_symptoms": {
                question: "هل يزداد الألم مع المجهود أو قلة النوم؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "صداع التوتر الإجهادي. ينصح بالراحة، شرب السوائل، والابتعاد عن الشاشات والضغوط النفسية.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "صداع بسيط ناتج عن الجفاف أو إجهاد العين. ينصح بشرب كمية كافية من الماء وفحص النظر إذا تكرر.", severity: "low" } }
                ]
            },
            "head_intermittent_type": {
                question: "هل يأتي الألم كنبضات في جانب واحد من الرأس؟",
                options: [
                    { text: "نعم", next: "head_migraine_triggers" },
                    { text: "لا", next: "head_sinus_check" }
                ]
            },
            "head_migraine_triggers": {
                question: "هل يزداد الألم مع الضوء الساطع أو الأصوات العالية؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "نوبة صداع نصفي (شقيقة) كلاسيكية. يوصى بالاسترخاء في غرفة مظلمة وباردة وتجنب المثيرات.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "صداع وعائي متقطع. ينصح بمراقبة الأغذية وتجنب الكافيين الزائد والنوم المنتظم.", severity: "medium" } }
                ]
            },
            "head_sinus_check": {
                question: "هل يزداد الألم عند الانحناء للأمام أو يصاحبه سيلان أنف؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "صداع الجيوب الأنفية. يفضل استنشاق البخار، استخدام محلول ملحي للأنف، ومراجعة الطبيب لوصف مضادات الاحتقان.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "صداع متقطع بسيط. ينصح بتنظيم أوقات النوم وتجنب المنبهات والتوتر.", severity: "low" } }
                ]
            }
        }
    },
    "scalp": {
        start: "scalp_start",
        nodes: {
            "scalp_start": {
                question: "ما هي الشكوى الأساسية في فروة الرأس؟",
                options: [
                    { text: "حكة وقشرة أو تساقط شعر", next: "scalp_itch_type" },
                    { text: "ألم، وخز أو صداع عند اللمس", next: "scalp_pain_type" }
                ]
            },
            "scalp_itch_type": {
                question: "هل الحكة مصحوبة باحمرار شديد وقشور دهنية صفراء أم قشور جافة بيضاء؟",
                options: [
                    { text: "قشور دهنية صفراء", diagnosis: { ar: "التهاب الجلد الدهني (Seborrheic Dermatitis) أو فطريات فروة الرأس. ينصح باستخدام شامبو مضاد للفطريات يحتوي على كيتوكونازول وتجنب غسل الشعر بماء ساخن جداً.", severity: "low" } },
                    { text: "قشور جافة بيضاء", diagnosis: { ar: "جفاف شديد في فروة الرأس أو قشرة بسيطة. ينصح باستخدام شامبو لطيف مرطب وتجنب استخدام منتجات تصفيف تحتوي على كحول.", severity: "low" } }
                ]
            },
            "scalp_pain_type": {
                question: "هل الوخز يشبه الصعق الكهربائي ويأتي كشحنات أم ألم مستمر مع شد في العضلات؟",
                options: [
                    { text: "شحنات كهربائية", diagnosis: { ar: "التهاب الأعصاب القذالية (Occipital Neuralgia). ينصح بعمل كمادات دافئة للرقبة من الخلف ومراجعة طبيب مخ وأعصاب لتقييم الحالة.", severity: "medium" } },
                    { text: "ألم مستمر وشد", diagnosis: { ar: "صداع التوتر العضلي المؤثر على فروة الرأس. ينصح بالراحة، وتدليك لطيف، واستخدام مسكنات بسيطة وتجنب الجلوس الطويل بوضعية خاطئة.", severity: "low" } }
                ]
            }
        }
    },
    "nose": {
        start: "nose_start",
        nodes: {
            "nose_start": {
                question: "ما هي الأعراض الرئيسية التي تشتكي منها في الأنف؟",
                options: [
                    { text: "انسداد، سيلان أو صعوبة تنفس", next: "nose_breathing" },
                    { text: "نزيف أو ألم بعد كدمة", next: "nose_bleeding_injury" }
                ]
            },
            "nose_breathing": {
                question: "هل السيلان مصحوب بحمى وألم وضغط حول العينين والوجنتين؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب الجيوب الأنفية الحاد (Acute Sinusitis). ينصح باستنشاق بخار ماء دافئ، واستخدام محلول ملحي للأنف، ومراجعة الطبيب إذا استمرت الأعراض لأكثر من 10 أيام.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "حساسية أنف موسمية أو نزلة برد بسيطة. يوصى بتجنب مسببات الحساسية واستخدام بخاخ أنفي مضاد للهيستامين.", severity: "low" } }
                ]
            },
            "nose_bleeding_injury": {
                question: "هل تعرضت لضربة أو كدمة مباشرة أم نزيف مفاجئ بدون إصابة؟",
                options: [
                    { text: "ضربة أو كدمة مباشرة", diagnosis: { ar: "اشتباه بكسر في عظام الأنف أو تجمع دموي في الحاجز الأنفي. ينصح بعمل كمادات باردة فوراً والتوجه لطبيب الأنف والأذن للفحص السريري.", severity: "medium" } },
                    { text: "نزيف مفاجئ", diagnosis: { ar: "رعاف بسيط (نزيف أنفي). ينصح بالجلوس مستقيماً، إمالة الرأس للأمام قليلاً، والضغط على الجزء اللين من الأنف لـ 10 دقائق متواصلة.", severity: "low" } }
                ]
            }
        }
    },
    "eyes": {
        start: "eyes_start",
        nodes: {
            "eyes_start": {
                question: "ما هو العرض الأكثر إزعاجاً في العين؟",
                options: [
                    { text: "احمرار، ألم شديد أو تغير في الرؤية", next: "eyes_severe" },
                    { text: "إجهاد، جفاف أو حكة خفيفة", next: "eyes_mild" }
                ]
            },
            "eyes_severe": {
                question: "هل تعاني من تشوش أو ضبابية في الرؤية، أو رؤية هالات حول الأضواء؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بارتفاع ضغط العين الحاد (الجلوكوما/المياه الزرقاء) أو التهاب القزحية. تتطلب هذه الحالة فحصاً فورياً لدى طبيب العيون في الطوارئ لتفادي تلف العصب البصري.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب ملتحمة العين (العين الوردية) أو خدش بسيط بالقرنية. ينصح بعدم فرك العين مطلقاً ومراجعة الطبيب لوصف قطرات مناسبة.", severity: "medium" } }
                ]
            },
            "eyes_mild": {
                question: "هل تقضي فترات طويلة أمام الشاشات الإلكترونية دون راحة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "متلازمة إجهاد العين الرقمي وجفاف العين. ينصح باتباع قاعدة 20-20-20 (النظر لمسافة 20 قدم لمدة 20 ثانية كل 20 دقيقة) واستخدام قطرات مرطبة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "حساسية العين الموسمية أو جفاف بسيط. ينصح باستخدام قطرات ترطيب العين وتجنب التعرض للأتربة والرياح الجافة.", severity: "low" } }
                ]
            }
        }
    },
    "ears": {
        start: "ears_start",
        nodes: {
            "ears_start": {
                question: "ما هي المشكلة الأساسية في الأذن؟",
                options: [
                    { text: "ألم في الأذن (داخلي أو خارجي)", next: "ears_pain" },
                    { text: "طنين، دوار أو ضعف في السمع", next: "ears_hearing" }
                ]
            },
            "ears_pain": {
                question: "هل يزداد الألم بشكل كبير عند لمس أو شد صيوان الأذن الخارجي؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب الأذن الخارجية (أذن السباح). ينصح بالحفاظ على جفاف الأذن تماماً وتجنب إدخال أي قطن تنظيف، ومراجعة الطبيب لوصف قطرات مضادة للالتهاب.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "التهاب الأذن الوسطى (Otitis Media)، خاصة بعد نزلة برد. ينصح بمراجعة الطبيب لفحص الطبلة ووصف العلاج المناسب.", severity: "medium" } }
                ]
            },
            "ears_hearing": {
                question: "هل يصاحب طنين الأذن شعور بالدوار وفقدان التوازن؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بالتهاب الأذن الداخلية أو متلازمة مينيير. ينصح بزيارة طبيب الأنف والأذن والحنجرة لإجراء فحص اتزان وتخطيط سمع.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "تجمع شمع الأذن (الصملاخ) أو تأثر بضوضاء عالية. يوصى بعدم استخدام الأعواد القطنية وزيارة الطبيب لشفط أو غسيل الشمع بأمان.", severity: "low" } }
                ]
            }
        }
    },
    "jaw": {
        start: "jaw_start",
        nodes: {
            "jaw_start": {
                question: "ما هو العرض الرئيسي لألم الفك؟",
                options: [
                    { text: "ألم في مفصل الفك أو صعوبة فتح الفم", next: "jaw_joint" },
                    { text: "ألم حاد في الأسنان أو اللثة", next: "jaw_dental" }
                ]
            },
            "jaw_joint": {
                question: "هل تسمع صوت طقطقة أو تشعر بتعليق في الفك عند مضغ الطعام أو فتح الفم? ",
                options: [
                    { text: "نعم", diagnosis: { ar: "اضطراب المفصل الصدغي الفكي (TMJ Disorder). ينصح بتناول الأطعمة اللينة، وتجنب مضغ العلكة، ووضع كمادات دافئة على جانبي الفك.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "تشنج عضلات الفك نتيجة الكز والضغط على الأسنان أثناء النوم بسبب القلق. ينصح بمراجعة طبيب الأسنان لعمل واقي فمي ليلي.", severity: "low" } }
                ]
            },
            "jaw_dental": {
                question: "هل الألم مصحوب بتورم وانتفاخ في الخد أو اللثة مع وجود حمى؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بخراج أسنان حاد. وهي حالة تتطلب التوجه فوراً لطبيب الأسنان لتفريغ الالتهاب ووصف مضادات حيوية مناسبة منعاً لانتشاره.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تسوس أسنان متقدم أو التهاب لثة بسيط. ينصح بالمحافظة على نظافة الفم ومراجعة طبيب الأسنان لعلاج السن المتضرر.", severity: "medium" } }
                ]
            }
        }
    },
    "face": {
        start: "face_start",
        nodes: {
            "face_start": {
                question: "أين يتركز الألم وما هي طبيعته في الوجه؟",
                options: [
                    { text: "ألم حاد ومفاجئ يشبه الكهرباء", next: "face_nerve" },
                    { text: "ثقل وضغط حول الوجنتين والجبهة", next: "face_sinus" }
                ]
            },
            "face_nerve": {
                question: "هل يثار الألم بمجرد لمس الوجه، غسل الأسنان، أو التحدث؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب العصب الخامس (Trigeminal Neuralgia). يتطلب ذلك مراجعة طبيب مخ وأعصاب لتلقي العلاج الدوائي المخصص لآلام الأعصاب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "ألم عصب وجهي مؤقت أو ألم منعكس من الأسنان. ينصح بالراحة ومراقبة الأعراض ومراجعة طبيب الأسنان أو المخ والأعصاب.", severity: "medium" } }
                ]
            },
            "face_sinus": {
                question: "هل يزداد هذا الضغط عند الانحناء للأمام ويصاحبه انسداد أنفي؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "احتقان شديد بالجيوب الأنفية الوجهية. ينصح باستخدام كمادات دافئة على الوجه، وغسول أنفي ملحي، وتناول مضادات الاحتقان.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "صداع توتري منعكس على الوجه أو إرهاق عضلات الوجه. ينصح بالاسترخاء، والتدليك اللطيف، وتناول مسكنات بسيطة.", severity: "low" } }
                ]
            }
        }
    },
    "neck": {
        start: "neck_start",
        nodes: {
            "neck_start": {
                question: "ما هي طبيعة ألم الرقبة الحالية؟",
                options: [
                    { text: "تيبس شديد مع عدم القدرة على ثني الرقبة وحمى", next: "neck_emergency" },
                    { text: "ألم عند الالتفات أو تشنج في العضلات", next: "neck_muscular" }
                ]
            },
            "neck_emergency": {
                question: "هل تعاني أيضاً من صداع شديد جداً، زغللة، أو حساسية للضوء؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه قوي بالتهاب السحايا (Meningitis). وهي حالة طبية طارئة مهددة للحياة تتطلب التوجه إلى قسم الطوارئ بالمستشفى فوراً دون تأخير.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تشنج عنقي حاد مصحوب بحمى خفيفة. يوصى بالذهاب للطبيب لتقييم الحالة سريرياً واستبعاد أي مضاعفات.", severity: "high" } }
                ]
            },
            "neck_muscular": {
                question: "هل يمتد الألم أو التنميل من الرقبة إلى الكتف أو الذراع والأصابع؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "انزلاق غضروفي عنقي (ديسك الرقبة) يضغط على الأعصاب. ينصح بعمل أشعة رنين مغناطيسي ومراجعة طبيب عظام أو عمود فقري وتجنب الأوضاع الخاطئة للرقبة.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "تشنج عضلي بسيط بالرقبة بسبب وضعية جلوس خاطئة أمام الكمبيوتر أو نوم غير مريح. ينصح بعمل تمارين إطالة خفيفة، كمادات دافئة، وتحسين بيئة العمل.", severity: "low" } }
                ]
            }
        }
    },
    "chest": {
        start: "chest_type",
        nodes: {
            "chest_type": {
                question: "هل تشعر بألم ضاغط كأن شيئاً ثقيلاً على صدرك أم ألم حاد عند التنفس؟",
                options: [
                    { text: "ضاغط وثقيل", next: "chest_cardiac_check" },
                    { text: "حاد ووخزي", next: "chest_pulmonary_check" }
                ]
            },
            "chest_cardiac_check": {
                question: "هل ينتشر هذا الألم إلى الفك، الرقبة، أو الذراع الأيسر؟",
                options: [
                    { text: "نعم", next: "chest_cardiac_emergency" },
                    { text: "لا", next: "chest_reflux_check" }
                ]
            },
            "chest_cardiac_emergency": {
                question: "هل يصاحبه تعرق بارد، ضيق تنفس أو دوار؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بأزمة قلبية حادة (احتشاء عضلة القلب). يرجى التوجه إلى الطوارئ فوراً أو الاتصال بالإسعاف دون تأخير.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "ذبحة صدرية غير مستقرة أو ألم بالقلب. ينصح بمراجعة طبيب قلب فوراً وعدم القيام بأي مجهود بدني.", severity: "high" } }
                ]
            },
            "chest_reflux_check": {
                question: "هل يزداد الألم بعد تناول الطعام أو عند الاستلقاء؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "ارتجاع في المريء أو حموضة شديدة. يوصى بتجنب الاستلقاء بعد الأكل وتناول مضادات الحموضة بعد استشارة الصيدلي.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "ألم عضلي أو تشنج في الصدر. ينصح بالراحة والكمادات الدافئة.", severity: "low" } }
                ]
            },
            "chest_pulmonary_check": {
                question: "هل يزداد الألم بشكل كبير عند أخذ نفس عميق أو السعال؟",
                options: [
                    { text: "نعم", next: "chest_pleurisy_fever" },
                    { text: "لا", diagnosis: { ar: "إجهاد عضلي في عضلات القفص الصدري. ينصح بالراحة واستخدام مسكنات ألم بسيطة.", severity: "low" } }
                ]
            },
            "chest_pleurisy_fever": {
                question: "هل تعاني من حمى أو سعال مصحوب ببلغم؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب رئوي أو غشاء الجنب. يجب استشارة طبيب الصدر فوراً لعمل الأشعة اللازمة ووصف المضاد الحيوي المناسب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب غشاء الجنب البسيط أو شد عضلي بين الضلوع. يفضل الراحة وزيارة الطبيب إذا استمر.", severity: "medium" } }
                ]
            }
        }
    },
    "upperchest": {
        start: "upperchest_start",
        nodes: {
            "upperchest_start": {
                question: "ما هي طبيعة الألم في أعلى الصدر؟",
                options: [
                    { text: "ألم حاد وخزي يزداد مع النفس العميق أو السعال", next: "upperchest_breathing" },
                    { text: "ألم ينتشر إلى الرقبة والكتف الأيسر مع ثقل", next: "upperchest_cardiac" }
                ]
            },
            "upperchest_breathing": {
                question: "هل تعاني من كحة، بلغم، أو ارتفاع في درجات الحرارة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بالتهاب رئوي أو التهاب الشعب الهوائية الحاد. يوصى بمراجعة طبيب الصدر لعمل أشعة صدر وفحص سريري لوصف العلاج المناسب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب غشاء الجنب البسيط أو شد عضلي في عضلات القفص الصدري العلوي. ينصح بالراحة ومسكنات بسيطة وزيارة الطبيب إذا استمر.", severity: "medium" } }
                ]
            },
            "upperchest_cardiac": {
                question: "هل يصاحب هذا الثقل تعرق بارد، ضيق تنفس، أو غثيان؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بنوبة قلبية حادة أو ذبحة صدرية في المنطقة العلوية. يرجى التوجه فوراً لأقرب طوارئ أو الاتصال بالإسعاف.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "شد عضلي عنيف أو التهاب موضعي في مفاصل الترقوة. ينصح بالراحة التامة ومراقبة الأعراض ومراجعة الطبيب فوراً إذا ساءت.", severity: "high" } }
                ]
            }
        }
    },
    "sternum": {
        start: "sternum_start",
        nodes: {
            "sternum_start": {
                question: "كيف يزداد الألم في منطقة عظم القص؟",
                options: [
                    { text: "يزداد بشكل واضح عند الضغط مباشرة بالإصبع على عظمة الصدر", next: "sternum_pressure" },
                    { text: "ألم داخلي خلف العظمة يشبه الحرقان", next: "sternum_internal" }
                ]
            },
            "sternum_pressure": {
                question: "هل الألم مصحوب بتورم خفيف أو احمرار في مكان الألم؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب الغضروف الضلعي الحاد (Tietze's Syndrome). حالة سليمة تزول تدريجياً بالراحة ومضادات الالتهاب غير الستيرويدية بعد استشارة الطبيب.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "التهاب الغضروف الضلعي البسيط (Costochondritis). ينصح بالكمادات الدافئة وتخفيف الأنشطة البدنية المجهدة للصدر.", severity: "low" } }
                ]
            },
            "sternum_internal": {
                question: "هل يزداد الحرقان بعد تناول الأطعمة الحارة أو الدسمة أو عند الاستلقاء؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "ارتجاع مريئي شديد أو التهاب جدار المريء خلف القص. ينصح بتقسيم الوجبات، وتناول مضادات الحموضة، وعدم النوم مباشرة بعد الأكل.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "ألم ناتج عن التوتر والقلق أو تشنج مريئي. يوصى بالراحة، وتناول مشروبات دافئة مهدئة، ومراجعة الطبيب إذا تكرر لاستبعاد مسببات أخرى.", severity: "low" } }
                ]
            }
        }
    },
    "breasts": {
        start: "breasts_start",
        nodes: {
            "breasts_start": {
                question: "ما هي طبيعة الألم أو التغيرات الملاحظة في الثدي؟",
                options: [
                    { text: "تورم، احمرار دافئ، كتلة صلبة أو حمى", next: "breasts_inflammatory" },
                    { text: "ألم دوري يتغير مع موعد الدورة الشهرية", next: "breasts_cyclical" }
                ]
            },
            "breasts_inflammatory": {
                question: "هل توجد إفرازات غير طبيعية من الحلمة (دموية أو صفراء)؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بالتهاب الثدي العميق أو خراج بالثدي، أو تغيرات تتطلب فحصاً نسيجياً. يجب مراجعة طبيبة النساء أو الجراحة فوراً لعمل فحص سريري وسونار/ماموجرام.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب الثدي الموضعي (Mastitis) شائع أثناء الرضاعة. يوصى بمراجعة الطبيبة لوصف المضادات الحيوية المناسبة وتجنب احتباس الحليب بالثدي.", severity: "medium" } }
                ]
            },
            "breasts_cyclical": {
                question: "هل يتركز الألم في كلا الثديين ويزداد قبل الدورة الشهرية بأيام؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "ألم الثدي الدوري الهرموني الطبيعي (Cyclical Mastalgia). ينصح بارتداء حمالة صدر داعمة مريحة، وتقليل تناول الكافيين والملح، واستخدام مسكنات بسيطة عند الحاجة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "ألم ثدي غير دوري ناتج عن شد عضلي في جدار الصدر الخلفي للثدي. يوصى بوضع كمادات دافئة ومراقبة أي تغيرات موضعية.", severity: "low" } }
                ]
            }
        }
    },
    "belly": {
        start: "belly_type",
        nodes: {
            "belly_type": {
                question: "أين يتركز الألم بشكل رئيسي في البطن؟",
                options: [
                    { text: "أعلى البطن", next: "belly_upper_type" },
                    { text: "أسفل البطن", next: "belly_lower_type" }
                ]
            },
            "belly_upper_type": {
                question: "هل الألم حاد ومفاجئ أم حرقان يزداد بعد الوجبات؟",
                options: [
                    { text: "حاد ومفاجئ", next: "belly_gallbladder_check" },
                    { text: "حرقان", diagnosis: { ar: "قرحة في المعدة أو ارتجاع مريء. يوصى بتجنب التوابل والمنبهات ومراجعة الطبيب.", severity: "medium" } }
                ]
            },
            "belly_gallbladder_check": {
                question: "هل ينتشر الألم إلى الظهر أو الكتف الأيمن مع غثيان؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه في التهاب المرارة أو حصوات مرارية. ينصح بزيارة الطبيب لعمل أشعة تلفزيونية وتجنب الأطعمة الدهنية.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب حاد في المعدة. يفضل تناول وجبات خفيفة ومراجعة الطبيب لوصف العلاج المناسب.", severity: "medium" } }
                ]
            },
            "belly_lower_type": {
                question: "هل الألم يتركز في الجانب الأيمن السفلي أم الجانب الأيسر السفلي؟",
                options: [
                    { text: "الأيمن السفلي", next: "belly_appendix_check" },
                    { text: "الأيسر السفلي", next: "belly_left_lower_fever" }
                ]
            },
            "belly_appendix_check": {
                question: "هل بدأ الألم حول السرة ثم انتقل لليمين مع غثيان أو حمى؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه قوي بالتهاب الزائدة الدودية. يرجى التوجه إلى الطوارئ فوراً لإجراء فحص سريري وتحاليل دم.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "قولون عصبي أو تقلصات معوية. يوصى بشرب السوائل الدافئة والابتعاد عن التوتر.", severity: "low" } }
                ]
            },
            "belly_left_lower_fever": {
                question: "هل يصاحب الألم حمى، إسهال أو إمساك شديد؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بالتهاب رتوج القولون (Diverticulitis). يرجى مراجعة الطبيب للفحص ووصف العلاج المناسب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تهيّج في القولون العصبي أو غازات. ينصح بتناول ألياف وشرب ماء دافئ وتجنب البقوليات.", severity: "low" } }
                ]
            }
        }
    },
    "epigastric": {
        start: "epigastric_start",
        nodes: {
            "epigastric_start": {
                question: "كيف تصف طبيعة الألم في منطقة فم المعدة؟",
                options: [
                    { text: "مغص شديد ومفاجئ يمتد للظهر أو الكتف الأيمن", next: "epigastric_severe" },
                    { text: "حرقان وضيق يزداد بعد تناول الطعام أو الجوع", next: "epigastric_mild" }
                ]
            },
            "epigastric_severe": {
                question: "هل يصاحب الألم غثيان مستمر، قيء، أو اصفرار في العينين (يرقان)؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه في التهاب البنكرياس الحاد أو انسداد القنوات المرارية بحصوة. يتطلب التوجه فوراً للطوارئ لعمل تحليل إنزيمات وأشعة تلفزيونية.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "نوبة مغص مراري ناتجة عن حصوات المرارة. ينصح بالابتعاد عن الدهون تماماً ومراجعة الطبيب لعمل سونار البطن.", severity: "high" } }
                ]
            },
            "epigastric_mild": {
                question: "هل يخف الألم مؤقتاً عند تناول الحليب أو مضادات الحموضة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "قرحة الاثني عشر أو التهاب جدار المعدة الحمضي. ينصح بفحص جرثومة المعدة (H. Pylori) وتجنب المسكنات مثل الإيبوبروفين التي تهيج المعدة.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "ارتجاع مريء أو عسر هضم وظيفي. ينصح بتناول وجبات صغيرة وتجنب التدخين والمنبهات ومراجعة الطبيب.", severity: "low" } }
                ]
            }
        }
    },
    "abdomenup": {
        start: "abdomenup_start",
        nodes: {
            "abdomenup_start": {
                question: "أين يتركز الألم بشكل رئيسي في الجزء العلوي من البطن؟",
                options: [
                    { text: "الجانب الأيمن العلوي (تحت الأضلاع اليمنى)", next: "abdomenup_right" },
                    { text: "الجانب الأيسر العلوي أو انتفاخ عام", next: "abdomenup_left_general" }
                ]
            },
            "abdomenup_right": {
                question: "هل يزداد الألم بعد تناول وجبة دسمة ويصاحبه مغص وغثيان؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب المرارة الحاد أو حصوات المرارة. ينصح بالراحة، وتناول طعام مسلوق خالي من الدهون، ومراجعة الطبيب لعمل سونار البطن.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "شد عضلي في جدار البطن أو تهيج في القولون الصاعد. يوصى بمراقبة الأعراض والراحة.", severity: "low" } }
                ]
            },
            "abdomenup_left_general": {
                question: "هل تشعر بامتلاء غازي شديد وتجشؤ مستمر بعد الأكل مباشرة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "عسر هضم وظيفي مع غازات في القولون المستعرض. ينصح بتناول مشروبات عشبية دافئة (مثل النعناع أو اليانسون) وتناول الطعام ببطء.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "تهيج في جدار المعدة أو قرحة معدية. ينصح بزيارة طبيب الباطنية لوصف العلاج المناسب لحماية جدار المعدة.", severity: "medium" } }
                ]
            }
        }
    },
    "abdomendown": {
        start: "abdomendown_start",
        nodes: {
            "abdomendown_start": {
                question: "أين يتركز ألم أسفل البطن؟",
                options: [
                    { text: "في الجانب الأيمن السفلي بشكل خاص", next: "abdomendown_right" },
                    { text: "في الوسط أو الجانب الأيسر السفلي", next: "abdomendown_left_mid" }
                ]
            },
            "abdomendown_right": {
                question: "هل بدأ الألم حول السرة ثم انتقل لليمين مع حرارة وغثيان، ويزداد بشدة عند المشي؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه قوي بالتهاب الزائدة الدودية الحاد (Acute Appendicitis). حالة جراحية طارئة تتطلب الذهاب إلى الطوارئ فوراً وعدم تناول أي مسكنات أو ملينات.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تشنج بالقولون أو التهاب بسيط في الغدد الليمفاوية بالبطن. ينصح بالراحة ومراجعة الطبيب إذا لم يتحسن الألم.", severity: "medium" } }
                ]
            },
            "abdomendown_left_mid": {
                question: "هل يصاحب الألم مغص كلوي ممتد للفخذ أو حرقان شديد وتغير في لون البول؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "حصوة في الحالب أو التهاب شديد في المسالك البولية. ينصح بشرب كميات كبيرة من الماء فوراً وعمل تحليل بول وأشعة لتقييم الكلى.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تهيج القولون العصبي (IBS) أو التهاب رتوج القولون (Diverticulitis) إذا صاحبه حمى. ينصح بتناول غذاء غني بالألياف والابتعاد عن التوتر.", severity: "medium" } }
                ]
            }
        }
    },
    "back": {
        start: "back_type",
        nodes: {
            "back_type": {
                question: "أين يتركز الألم بشكل أساسي في الظهر؟",
                options: [
                    { text: "أسفل الظهر", next: "back_lower_type" },
                    { text: "أعلى أو منتصف الظهر", next: "back_upper_type" }
                ]
            },
            "back_lower_type": {
                question: "هل يمتد الألم إلى الساق أو القدم مع شعور بالتنميل والكهرباء؟",
                options: [
                    { text: "نعم", next: "back_sciatica_severity" },
                    { text: "لا", diagnosis: { ar: "شد عضلي حاد في أسفل الظهر. يوصى بالراحة المؤقتة، كمادات دافئة، وتجنب الانحناء المفاجئ.", severity: "low" } }
                ]
            },
            "back_sciatica_severity": {
                question: "هل تواجه صعوبة في التحكم بالبول أو ضعف مفاجئ في حركة القدم (سقوط القدم)؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "متلازمة ذيل الفرس أو ضغط شديد على النخاع الشوكي. حالة طارئة تتطلب الذهاب إلى الطوارئ فوراً لفحص جراحي عاجل.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "اشتباه بانزلاق غضروفي (عرق النسا). ينصح بالابتعاد عن حمل الأوزان، والمشي الخفيف، ومراجعة طبيب أعصاب.", severity: "medium" } }
                ]
            },
            "back_upper_type": {
                question: "هل الألم يصاحبه ضيق في التنفس أو ينتشر إلى الصدر؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "قد يكون للألم علاقة بمشاكل رئوية أو قلبية. يجب مراجعة الطبيب فوراً للاطمئنان وعمل رسم قلب.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "تشنج عضلي ناتج عن وضعية جلوس خاطئة أو إجهاد العمل. ينصح بتحسين وضعية الجلوس وممارسة تمارين إطالة الظهر.", severity: "low" } }
                ]
            }
        }
    },
    "shoulder": {
        start: "shoulder_start",
        nodes: {
            "shoulder_start": {
                question: "ما هي المشكلة الرئيسية في مفصل الكتف؟",
                options: [
                    { text: "ألم حاد وصعوبة شديدة في تحريك الذراع للأعلى أو الخلف", next: "shoulder_movement" },
                    { text: "ألم بعد النوم بوضعية خاطئة أو حمل حقيبة ثقيلة", next: "shoulder_posture" }
                ]
            },
            "shoulder_movement": {
                question: "هل تشعر بتيبس كامل في المفصل كأنه متجمد أم تشعر بضعف مفاجئ عند رفع الذراع؟",
                options: [
                    { text: "تيبس كامل وكأنه متجمد", diagnosis: { ar: "كتف متجمدة (Adhesive Capsulitis). ينصح ببدء جلسات علاج طبيعي متخصصة واستخدام مسكنات ومضادات التهاب بعد استشارة طبيب عظام.", severity: "medium" } },
                    { text: "ضعف مفاجئ عند الرفع", diagnosis: { ar: "التهاب أو تمزق في أوتار الكفة المدورة (Rotator Cuff Tear/Tendinitis). ينصح بارتداء مشد للكتف وتجنب الأنشطة فوق مستوى الرأس وعمل أشعة رنين مغناطيسي.", severity: "medium" } }
                ]
            },
            "shoulder_posture": {
                question: "هل الألم يزول تدريجياً مع التدليك اللطيف والكمادات الدافئة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "تشنج عضلي بسيط في عضلات لوح الكتف أو الترقوة. يوصى بالراحة واستخدام دهان مسكن موضعي.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "التهاب جراب الكتف (Bursitis) أو خشونة أولية بالمفصل. يوصى بالراحة وزيارة طبيب العظام إذا استمر الألم لأكثر من أسبوعين.", severity: "low" } }
                ]
            }
        }
    },
    "upperarm": {
        start: "upperarm_start",
        nodes: {
            "upperarm_start": {
                question: "كيف بدأ ألم العضد (الذراع العلوي)؟",
                options: [
                    { text: "بعد تمرين رياضي مجهد أو حمل أوزان ثقيلة", next: "upperarm_strain" },
                    { text: "ألم مستمر وتنميل يمتد من الرقبة وصولاً للأصابع", next: "upperarm_radiculopathy" }
                ]
            },
            "upperarm_strain": {
                question: "هل تلاحظ تورماً أو كدمة زرقاء، أو شكلاً غير متناسق في العضلة ثنائية الرؤوس (البايسبس)؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "تمزق عضلي أو اشتباه بتمزق في وتر عضلة البايسبس. ينصح بوضع ثلج فوراً، تثبيت الذراع، والتوجه لطبيب عظام لتقييم الحاجة للعلاج أو الجراحة.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "إجهاد عضلي بسيط نتيجة زيادة الحمل التدريبي. ينصح بالراحة لعدة أيام، وعمل كمادات دافئة لاحقاً، وتدليك خفيف.", severity: "low" } }
                ]
            },
            "upperarm_radiculopathy": {
                question: "هل يزداد التنميل والألم عند تحريك أو إمالة الرقبة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اعتلال الجذور العنقية (انضغاط عصب في الرقبة بسبب ديسك). ينصح بتجلس الرأس مستقيماً وتجنب الأوضاع الخاطئة واستشارة طبيب مخ وأعصاب أو عظام.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "التهاب عصب موضعي أو ضعف مؤقت في الدورة الدموية. ينصح بعمل تمارين تمدد خفيفة ومراجعة الطبيب إذا تكرر.", severity: "low" } }
                ]
            }
        }
    },
    "elbow": {
        start: "elbow_start",
        nodes: {
            "elbow_start": {
                question: "أين يتركز الألم في المرفق بشكل رئيسي؟",
                options: [
                    { text: "في البروز الخارجي للكوع ويزداد عند الإمساك بالأشياء", next: "elbow_tennis" },
                    { text: "في الجزء الداخلي أو يصاحبه وخز كهربائي في الخنصر", next: "elbow_ulnar" }
                ]
            },
            "elbow_tennis": {
                question: "هل تقوم بحركات متكررة للرسغ كالكتابة أو استخدام المضرب؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "مرفق التنس (Tennis Elbow - التهاب اللقيمة الوحشية). ينصح بارتداء مشد الكوع المخصص وتخفيف حركة الرسغ ووضع كمادات باردة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "التهاب وتر موضعي بسيط بالساعد. ينصح بالراحة واستخدام مسكن ألم موضعي.", severity: "low" } }
                ]
            },
            "elbow_ulnar": {
                question: "هل تشعر بتنميل وكهرباء يمتدان للإصبعين الصغيرين عند ثني الكوع؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "متلازمة النفق المرف بتمارين إطالة خفيفة وحمام دافئ وشرب كميات كافية من الماء.", severity: "low" } }
                ]
            },
            "thigh_hip": {
                question: "هل يزداد ألم الورك عند المشي لمسافات طويلة ويخف بالراحة؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "خشونة مفصل الورك (Hip Osteoarthritis). ينصح بإنقاص الوزن، وتجنب الجلوس على مقاعد منخفضة، وزيارة طبيب العظام لتقييم المفصل.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "التهاب الجراب الوركي (Trochanteric Bursitis). ينصح بالنوم على الجانب الآخر واستخدام مسكنات بسيطة ووضع كمادات باردة.", severity: "low" } }
                ]
            }
        }
    },
    "knee": {
        start: "knee_start",
        nodes: {
            "knee_start": {
                question: "كيف بدأ ألم الركبة؟",
                options: [
                    { text: "التواء حاد أو سقوط أثناء ممارسة الرياضة مصحوب بتورم", next: "knee_injury" },
                    { text: "ألم تدريجي ومستمر يزداد مع صعود السلالم أو الجلوس الطويل", next: "knee_chronic" }
                ]
            },
            "knee_injury": {
                question: "هل سمعت صوت فرقعة داخل الركبة وقت الإصابة، وهل تعاني من عدم ثبات المفصل؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه بتمزق الرباط الصليبي الأمامي (ACL) أو تمزق شديد في الغضروف الهلالي. يتطلب مراجعة طبيب العظام لعمل أشعة رنين مغناطيسي (MRI).", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التواء بسيط في أربطة الركبة الجانبية. ينصح بتطبيق بروتوكول الراحة، الثلج، المشد الضاغط، ورفع الساق (RICE).", severity: "medium" } }
                ]
            },
            "knee_chronic": {
                question: "هل تسمع صوت طقطقة أو تشعر باحتكاك خشن داخل الركبة عند ثنيها؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "خشونة في مفصل الركبة (Knee Osteoarthritis). ينصح بتقوية عضلات الفخذ الأمامية، وتجنب ثني الركبة بالكامل (التربيع)، والمحافظة على وزن مثالي.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "متلازمة الألم الرضفي الفخذي (ركبة العداء). يوصى بالراحة المؤقتة، واستخدام مشد داعم للركبة، وتمارين تقوية محددة.", severity: "low" } }
                ]
            }
        }
    },
    "shin": {
        start: "shin_start",
        nodes: {
            "shin_start": {
                question: "ما هي الأعراض المحددة التي تشعر بها في الساق؟",
                options: [
                    { text: "ألم في عظمة الساق الأمامية يزداد أثناء الجري أو المشي السريع", next: "shin_splints" },
                    { text: "تورم، احمرار، وحرارة شديدة في عضلة بطة الساق الخلفية", next: "shin_dvt" }
                ]
            },
            "shin_splints": {
                question: "هل تمارس رياضة الجري بانتظام على أسطح صلبة وتستخدم حذاءً غير مناسب؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب غشاء عظم الساق (Shin Splints). ينصح بالتوقف عن الجري على أسطح صلبة، واستخدام أحذية رياضية طبية مبطنة، وعمل كمادات ثلج على العظمة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "شد عضلي بسيط في عضلات الساق الأمامية. ينصح بالراحة والتمارين الخفيفة للإطالة.", severity: "low" } }
                ]
            },
            "shin_dvt": {
                question: "هل خضعت لعملية جراحية مؤخراً أو جلست لفترات طويلة جداً (مثل رحلة طيران طويلة)؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "اشتباه قوي بجلطة أوردة الساق العميقة (DVT). وهي حالة طارئة جداً تتطلب التوجه إلى الطوارئ فوراً لعمل فحص دوبلر ملون على الأوردة وعدم تدليك الساق نهائياً.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التهاب خلوي (خلوي جلدي) أو تمزق عضلي في بطة الساق. يجب مراجعة الطبيب فوراً للفحص ووصف العلاج المناسب.", severity: "high" } }
                ]
            }
        }
    },
    "ankle": {
        start: "ankle_start",
        nodes: {
            "ankle_start": {
                question: "كيف بدأ ألم الكاحل؟",
                options: [
                    { text: "التواء مفاجئ للقدم للداخل أثناء المشي أو الجري", next: "ankle_twist" },
                    { text: "ألم مستمر وتيبس في وتر الكاحل الخلفي", next: "ankle_achilles" }
                ]
            },
            "ankle_twist": {
                question: "هل هناك انتفاخ شديد، ازرقاق في الكاحل، وعدم قدرة على الوقوف عليه نهائياً؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التواء كاحل شديد (تمزق أربطة كامل) أو كسر في عظام الكاحل (شظية أو قصبة). يوصى بتثبيت الكاحل بعمل جبيرة مؤقتة والتوجه للطوارئ لعمل أشعة سينية.", severity: "high" } },
                    { text: "لا", diagnosis: { ar: "التواء كاحل بسيط من الدرجة الأولى. ينصح بوضع رباط ضاغط، ثلج لـ 15 دقيقة عدة مرات، رفع القدم، وتجنب تحميل الوزن الزائد.", severity: "medium" } }
                ]
            },
            "ankle_achilles": {
                question: "هل الألم يشتد صباحاً أو بعد بذل مجهود قفز أو جري؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب وتر أكيلس (Achilles Tendonitis). ينصح بالراحة التامة، ووضع كعب سيليكون لارتفاع بسيط وتخفيف الشد على الوتر، ومراجعة طبيب عظام.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "تيبس بمفصل الكاحل نتيجة إجهاد عام. يوصى بعمل مغاطس ماء دافئ وتمارين إطالة خفيفة للوتر.", severity: "low" } }
                ]
            }
        }
    },
    "foot": {
        start: "foot_start",
        nodes: {
            "foot_start": {
                question: "أين تشعر بالألم في القدم تحديداً؟",
                options: [
                    { text: "في كعب القدم من الأسفل ويزداد مع الخطوات الأولى صباحاً", next: "foot_heel" },
                    { text: "ألم مفاجئ وحرارة واحمرار في مفصل إصبع القدم الكبير", next: "foot_gout" }
                ]
            },
            "foot_heel": {
                question: "هل الألم يتحسن قليلاً بعد المشي لبعض الوقت ثم يعود بعد الجلوس الطويل؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "التهاب اللفافة الأخمصية (شوكة الكعب). ينصح بارتداء أحذية طبية لينة ذات كعب مرتفع قليلاً، وعمل تمارين تمدد لأسفل القدم باستخدام كرة صغيرة.", severity: "low" } },
                    { text: "لا", diagnosis: { ar: "ألم ناتج عن إجهاد عظام القدم أو نقص في دهون الكعب. يوصى بالراحة واستخدام نعال طبية مبطنة.", severity: "low" } }
                ]
            },
            "foot_gout": {
                question: "هل تتناول اللحوم الحمراء أو البقوليات بكثرة، أو تعاني من ارتفاع حمض اليوريك؟",
                options: [
                    { text: "نعم", diagnosis: { ar: "نوبة نقرس حادة (Gouty Arthritis). ينصح بمراجعة الطبيب لوصف مضادات الالتهاب المخصصة للنقرس، وشرب كميات هائلة من الماء، والحد من الأغذية الغنية بالبيورين.", severity: "medium" } },
                    { text: "لا", diagnosis: { ar: "التهاب مفصل موضعي أو إصابة خفيفة في إصبع القدم. ينصح بالراحة، وضع ثلج، ومسكنات بسيطة.", severity: "low" } }
                ]
            }
        }
    }
};

decisionTrees["rightarm"] = getArmTree("Right Arm", "الأيمن");
decisionTrees["leftarm"] = getArmTree("Left Arm", "الأيسر");
decisionTrees["rightleg"] = getLegTree("Right Leg", "اليمنى");
decisionTrees["leftleg"] = getLegTree("Left Leg", "اليسرى");


function showDecisionNode() {
    if (!currentNodeKey) return;
    const tree = decisionTrees[normalizeKey(activePart)];
    if (!tree) return;
    const node = tree.nodes[currentNodeKey];
    if (!node) return;
    
    addMessage(node.question, 'ai');
    updateQuickQuestionsForDecisionNode(node);
    
    const stepsCount = userAnswers.length;
    const progress = Math.min(90, (stepsCount + 1) * 25);
    updateProgress(progress);
}

function updateQuickQuestionsForDecisionNode(node) {
    quickQuestions.innerHTML = '';
    node.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'quick-question';
        button.textContent = option.text;
        button.onclick = () => answerQuick(option.text);
        quickQuestions.appendChild(button);
    });
}

function getMatchedOption(options, userText) {
    const cleanText = userText.trim().toLowerCase();
    
    // Exact match
    let matched = options.find(opt => opt.text.toLowerCase() === cleanText);
    if (matched) return matched;
    
    // Substring match
    matched = options.find(opt => cleanText.includes(opt.text.toLowerCase()) || opt.text.toLowerCase().includes(cleanText));
    if (matched) return matched;
    
    // Arabic synonyms match
    if (cleanText.includes("نعم") || cleanText.includes("ايوه") || cleanText.includes("صح") || cleanText.includes("أجل") || cleanText.includes("يب") || cleanText.includes("تمام")) {
        matched = options.find(opt => opt.text === "نعم" || opt.text.includes("نعم"));
        if (matched) return matched;
    }
    if (cleanText.includes("لا") || cleanText.includes("ما في") || cleanText.includes("كلا") || cleanText.includes("مش") || cleanText.includes("ابدا")) {
        matched = options.find(opt => opt.text === "لا" || opt.text.includes("لا"));
        if (matched) return matched;
    }
    
    return null;
}

function handleDecisionTreeAnswer(answerText) {
    const tree = decisionTrees[normalizeKey(activePart)];
    if (!tree || !currentNodeKey) return;
    
    const node = tree.nodes[currentNodeKey];
    if (!node) return;
    
    const matchedOption = getMatchedOption(node.options, answerText);
    if (!matchedOption) {
        addMessage("عذراً، يرجى الاختيار من الإجابات المتاحة للتشخيص بدقة:", 'ai');
        updateQuickQuestionsForDecisionNode(node);
        userAnswers.pop(); // Remove the invalid answer
        return;
    }
    
    if (matchedOption.next) {
        currentNodeKey = matchedOption.next;
        showDecisionNode();
    } else if (matchedOption.diagnosis) {
        updateProgress(95);
        setTimeout(() => {
            const finalDiagnosis = {
                part: activePart,
                diagnosisAr: matchedOption.diagnosis.ar,
                diagnosisEn: "",
                severity: matchedOption.diagnosis.severity,
                date: new Date().toLocaleDateString('ar-SA'),
                time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
            };
            showDiagnosis(finalDiagnosis);
            updateProgress(100);
        }, 1000);
    }
}

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const quickQuestions = document.getElementById('quick-questions');

// ===== CHAT HELPER FUNCTIONS =====
function getProviderInfo(key) {
    if (!key) return null;
    const cleanKey = key.trim();
    if (cleanKey.startsWith("sk-or-v1-")) {
        return {
            name: "OpenRouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            model: "google/gemini-2.5-flash:free",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cleanKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "3D Diagnosis System"
            },
            isOpenAIStyle: true
        };
    } else if (cleanKey.startsWith("sk-")) {
        return {
            name: "OpenAI",
            url: "https://api.openai.com/v1/chat/completions",
            model: "gpt-4o-mini",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cleanKey}`
            },
            isOpenAIStyle: true
        };
    } else {
        // Default Google Gemini
        return {
            name: "Google Gemini",
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
            model: "gemini-2.5-flash",
            headers: {
                "Content-Type": "application/json"
            },
            isOpenAIStyle: false
        };
    }
}

function convertHistoryToOpenAIStyle(geminiHistory, systemInstruction, currentPartAr) {
    const messages = [];
    
    messages.push({
        role: "system",
        content: systemInstruction
    });
    
    if (geminiHistory.length === 0) {
        messages.push({
            role: "user",
            content: `لقد حددت منطقة الألم في: ${currentPartAr}. ابدأ بطرح السؤال الأول.`
        });
    } else {
        geminiHistory.forEach(item => {
            const role = item.role === "model" ? "assistant" : "user";
            const text = item.parts?.[0]?.text || "";
            messages.push({
                role: role,
                content: text
            });
        });
    }
    
    return messages;
}

function tryParseJSON(text) {
    if (!text) throw new Error("Empty JSON text");
    let clean = text.trim();
    // Remove markdown code block markers case-insensitively
    if (clean.startsWith("```")) {
        const nextNewline = clean.indexOf("\n");
        if (nextNewline !== -1) {
            clean = clean.substring(nextNewline + 1);
        } else {
            clean = clean.substring(3);
        }
    }
    if (clean.endsWith("```")) {
        clean = clean.substring(0, clean.length - 3);
    }
    clean = clean.trim();

    try {
        return JSON.parse(clean);
    } catch (e) {
        console.warn("Direct JSON parsing failed, attempting extraction:", e);
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (innerE) {
                throw new Error("Failed to parse extracted JSON block: " + innerE.message);
            }
        }
        throw e;
    }
}

function updateTypingText(text) {
    const textEl = document.querySelector('#typing-indicator .typing-text');
    if (textEl) {
        textEl.textContent = text;
    }
}

// ===== CHAT FUNCTIONS =====
function updateInputGroupVisibility() {
    const inputGroup = document.querySelector('.input-group');
    if (inputGroup) {
        inputGroup.style.display = isUsingGemini ? 'flex' : 'none';
    }
}

function startChatForPart(partName) {
    activePart = partName;
    chatActive = true;
    
    document.getElementById('chat-welcome').style.display = 'none';
    chatMessages.innerHTML = '';
    currentQuestion = 0;
    userAnswers = [];
    
    // التحقق من مفتاح Gemini API
    const apiKey = localStorage.getItem('dds_gemini_api_key');
    isUsingGemini = !!apiKey;
    updateInputGroupVisibility();
    geminiChatHistory = [];
    
    updateProgress(0);
    
    const arabicNames = {
        "Head": "الرأس",
        "Chest": "الصدر",
        "Belly": "البطن",
        "Right Arm": "الذراع الأيمن",
        "Left Arm": "الذراع الأيسر",
        "Right Leg": "القدم اليمنى",
        "Left Leg": "القدم اليسرى",
        "Back": "الظهر"
    };
    
    const partNameAr = arabicNames[partName] || partName;
    
    if (isUsingGemini) {
        addMessage(`بدأ التشخيص الذكي لمنطقة ${partNameAr}. يرجى الانتظار لتلقي أول سؤال من المساعد الذكي...`, 'ai');
        callGeminiChat(null);
    } else {
        addMessage(`بدأ التشخيص لمنطقة ${partNameAr}. سأقوم بطرح بعض الأسئلة لفهم حالتك بشكل أفضل.`, 'ai');
        currentNodeKey = decisionTrees[normalizeKey(partName)]?.start || "head_type";
        setTimeout(() => showDecisionNode(), 1000);
    }
}

async function callGeminiChat(userText) {
    showTypingIndicator();
    
    const apiKey = localStorage.getItem('dds_gemini_api_key');
    if (!apiKey) {
        removeTypingIndicator();
        showNotification("مفتاح الـ API غير متوفر! التراجع للتشخيص المحلي.", "error");
        isUsingGemini = false;
        updateInputGroupVisibility();
        currentNodeKey = decisionTrees[normalizeKey(activePart)]?.start || "head_type";
        showDecisionNode();
        return;
    }
    
    if (userText) {
        geminiChatHistory.push({
            role: "user",
            parts: [{ text: userText }]
        });
    }
    
    const arabicNames = {
        "Head": "الرأس",
        "Chest": "الصدر",
        "Belly": "البطن",
        "Right Arm": "الذراع الأيمن",
        "Left Arm": "الذراع الأيسر",
        "Right Leg": "القدم اليمنى",
        "Left Leg": "القدم اليسرى",
        "Back": "الظهر"
    };
    
    const currentPartAr = arabicNames[activePart] || activePart;
    
    const systemInstruction = `أنت طبيب تشخيصي محترف ومساعد طبي ذكي باللغة العربية.
مهمتك هي إجراء محادثة تشخيصية قصيرة وذكية مع المريض لتشخيص ألم في منطقة: (${currentPartAr}).
التعليمات:
1. يجب أن تطرح على المريض أسئلة دقيقة (سؤالاً تلو الآخر) لفهم حالته (بحد أقصى 4 أسئلة في المجمل).
2. يجب أن تكون إجابتك دائماً كائن JSON صالح فقط ولا شيء غيره (لا تكتب أي كود markdown أو نصوص خارج الـ JSON).
3. يجب أن يلتزم الـ JSON بالهيكل التالي بدقة:
{
  "nextQuestion": "نص السؤال القادم الموجه للمريض باللغة العربية (أو null إذا كان لديك معلومات كافية لتقديم التشخيص النهائي)",
  "diagnosisAr": "التقرير التشخيصي المقترح باللغة العربية بالتفصيل والنصائح المفيدة (أو null إذا لم ينتهِ التشخيص بعد)",
  "diagnosisEn": "التوصيات الطبية باللغة الإنجليزية بالتفصيل (أو null إذا لم ينتهِ التشخيص بعد)",
  "severity": "مستوى الخطورة ('low' أو 'medium' أو 'high') بناءً على الأعراض (أو null إذا لم ينتهِ التشخيص بعد)",
  "isFinished": true/false
}
4. تأكد من أن يكون التشخيص العربي مفصلاً واحترافياً. وحقل "diagnosisEn" يجب ألا يكون ترجمة للتشخيص العربي بل يجب أن يحتوي حصرياً على توصيات طبية وإرشادات عملية للمريض باللغة الإنجليزية (مثل: الراحة Rest، شرب السوائل Drink Fluids، الكمادات Warm/Cold Compresses، أو مراجعة الطبيب فوراً Seek Medical Attention Immediately) تتناسب مع حالته الصحية المكتشفة.`;

    const provider = getProviderInfo(apiKey);
    let response;
    let retries = 0;
    const maxRetries = 5;
    let baseDelay = 1500;

    while (retries < maxRetries) {
        try {
            let requestBody;
            if (provider.isOpenAIStyle) {
                const openAIMessages = convertHistoryToOpenAIStyle(geminiChatHistory, systemInstruction, currentPartAr);
                requestBody = JSON.stringify({
                    model: provider.model,
                    messages: openAIMessages,
                    response_format: { type: "json_object" }
                });
            } else {
                requestBody = JSON.stringify({
                    contents: geminiChatHistory.length > 0 ? geminiChatHistory : [{ role: "user", parts: [{ text: `لقد حددت منطقة الألم في: ${currentPartAr}. ابدأ بطرح السؤال الأول.` }] }],
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
            }

            response = await fetch(provider.url, {
                method: "POST",
                headers: provider.headers,
                body: requestBody
            });

            if (response.status === 429) {
                retries++;
                if (retries >= maxRetries) {
                    throw new Error(`${provider.name} API returned status 429 after ${maxRetries} attempts`);
                }
                const delay = baseDelay * Math.pow(2, retries - 1);
                console.warn(`${provider.name} API returned 429 (Too Many Requests). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                updateTypingText(`الخادم مشغول، جاري إعادة المحاولة... (محاولة ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            if (!response.ok) {
                throw new Error(`${provider.name} API returned status ${response.status}`);
            }
            break;
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, retries - 1);
            console.warn(`Fetch error in callGeminiChat:`, error);
            updateTypingText(`خطأ في الاتصال، جاري إعادة المحاولة... (محاولة ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    try {
        removeTypingIndicator();
        
        const data = await response.json();
        let responseText;
        if (provider.isOpenAIStyle) {
            responseText = data.choices?.[0]?.message?.content;
        } else {
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!responseText) {
            throw new Error(`Empty response from ${provider.name} API`);
        }
        
        const result = tryParseJSON(responseText);
        
        geminiChatHistory.push({
            role: "model",
            parts: [{ text: responseText }]
        });
        
        if (result.isFinished) {
            updateProgress(95);
            setTimeout(() => {
                const finalDiagnosis = {
                    part: activePart,
                    diagnosisAr: result.diagnosisAr || "لم يتم تحديد تشخيص عربي من الذكاء الاصطناعي.",
                    diagnosisEn: result.diagnosisEn || "No English recommendations provided.",
                    severity: result.severity || "low",
                    date: new Date().toLocaleDateString('ar-SA'),
                    time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                };
                showDiagnosis(finalDiagnosis);
                updateProgress(100);
            }, 1000);
        } else {
            const nextQ = result.nextQuestion || "هل هناك أي تفاصيل أخرى تود مشاركتها؟";
            addMessage(nextQ, 'ai');
            updateQuickQuestions(nextQ);
            
            const progress = Math.min(90, (geminiChatHistory.length / 10) * 100);
            updateProgress(progress);
        }
        
    } catch (error) {
        console.error(`${provider.name} API Error:`, error);
        removeTypingIndicator();
        showNotification("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. سيتم استكمال التشخيص محلياً.", "error");
        
        isUsingGemini = false;
        updateInputGroupVisibility();
        currentQuestion = 0;
        userAnswers = [];
        currentNodeKey = decisionTrees[normalizeKey(activePart)]?.start || "head_type";
        showDecisionNode();
    }
}

function askNextQuestion() {
    const questions = getQuestionsForPart(activePart);
    
    if (currentQuestion < questions.length) {
        const question = questions[currentQuestion];
        addMessage(question, 'ai');
        
        updateQuickQuestions(question);
        
        const progress = ((currentQuestion + 1) / (questions.length + 1)) * 100;
        updateProgress(progress);
        
        currentQuestion++;
    } else {
        setTimeout(() => analyzeAnswers(), 1000);
    }
}

function getQuestionsForPart(partName) {
    const questions = {
        "Head": [
            "هل الألم مستمر أم يأتي على فترات؟",
            "هل يصاحب الألم دوخة أو غثيان؟",
            "هل يزداد الألم مع الضوء أو الأصوات العالية؟",
            "منذ متى وأنت تعاني من هذا الألم؟",
            "هل هناك تاريخ عائلي للصداع النصفي؟"
        ],
        "Chest": [
            "هل الألم حاد أم ضاغط؟",
            "هل ينتشر الألم إلى الذراع أو الفك؟",
            "هل يصاحبه ضيق في التنفس أو تعرق؟",
            "هل يزداد مع الحركة أو الراحة؟",
            "هل لديك تاريخ مع أمراض القلب؟"
        ],
        "Belly": [
            "هل الألم مستمر أم متقطع؟",
            "هل يصاحبه غثيان أو قيء؟",
            "هل هناك تغير في عادات الإخراج؟",
            "هل يزداد الألم بعد الأكل؟",
            "هل تناولت أطعمة غير معتادة مؤخراً؟"
        ],
        "Right Arm": [
            "هل الألم في المفصل أم العضلة؟",
            "هل هناك تورم أو احمرار في المنطقة؟",
            "هل حدثت إصابة مؤخراً؟",
            "هل يزداد الألم مع الحركة؟",
            "هل هناك تنميل أو وخز في الأصابع؟"
        ],
        "Left Arm": [
            "هل الألم في المفصل أم العضلة؟",
            "هل هناك تورم أو احمرار في المنطقة؟",
            "هل حدثت إصابة مؤخراً؟",
            "هل يزداد الألم مع الحركة؟",
            "هل هناك تنميل أو وخز في الأصابع؟"
        ],
        "Right Leg": [
            "هل الألم في الركبة أم القدم أم الفخذ؟",
            "هل هناك صعوبة في المشي أو الوقوف؟",
            "هل حدث سقوط أو إصابة مؤخراً؟",
            "هل هناك تورم في المنطقة؟",
            "هل يزداد الألم مع الحركة؟"
        ],
        "Left Leg": [
            "هل الألم في الركبة أم القدم أم الفخذ؟",
            "هل هناك صعوبة في المشي أو الوقوف؟",
            "هل حدث سقوط أو إصابة مؤخراً؟",
            "هل هناك تورم في المنطقة؟",
            "هل يزداد الألم مع الحركة؟"
        ],
        "Back": [
            "هل الألم في أعلى الظهر أم أسفله؟",
            "هل يمتد الألم إلى الساق؟",
            "هل هناك تنميل أو خدر؟",
            "هل زاد الألم بعد حمل شيء ثقيل؟",
            "هل يخف مع الراحة أم يزداد؟"
        ]
    };
    
    return questions[partName] || [
        "أخبرني أكثر عن الألم...",
        "هل الألم حاد أم خفيف؟",
        "منذ متى وأنت تشعر بهذا الألم؟",
        "هل هناك أعراض أخرى مصاحبة؟",
        "هل هناك شيء يخفف الألم؟"
    ];
}

function updateQuickQuestions(question) {
    quickQuestions.innerHTML = '';
    if (isUsingGemini) {
        return;
    }
    
    let quickAnswers = [];
    
    if (question.includes("مستمر") || question.includes("فترات")) {
        quickAnswers = ["مستمر", "متقطع"];
    } else if (question.includes("حاد") || question.includes("خفيف")) {
        quickAnswers = ["حاد", "خفيف", "متوسط"];
    } else if (question.includes("يزداد") || question.includes("يخف")) {
        quickAnswers = ["يزداد", "يخف", "مستقر"];
    } else if (question.includes("نعم") || question.includes("هل")) {
        quickAnswers = ["نعم", "لا", "لا أعرف"];
    } else {
        quickAnswers = ["مستمر", "متقطع", "حاد", "خفيف"];
    }
    
    quickAnswers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'quick-question';
        button.textContent = answer;
        button.onclick = () => answerQuick(answer);
        quickQuestions.appendChild(button);
    });
}

function sendChatMessage() {
    const input = userInput;
    const text = input.value.trim();
    
    if (text === '' || !chatActive) return;
    
    addMessage(text, 'user');
    userAnswers.push(text);
    input.value = '';
    quickQuestions.innerHTML = '';
    
    if (isUsingGemini) {
        callGeminiChat(text);
    } else {
        showTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator();
            handleDecisionTreeAnswer(text);
        }, 1000);
    }
}

function answerQuick(answer) {
    if (!chatActive) return;
    
    addMessage(answer, 'user');
    userAnswers.push(answer);
    quickQuestions.innerHTML = '';
    
    if (isUsingGemini) {
        callGeminiChat(answer);
    } else {
        showTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator();
            handleDecisionTreeAnswer(answer);
        }, 800);
    }
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    messageDiv.textContent = text;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">يكتب...</span>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}% مكتمل`;
}

// ===== DIAGNOSIS FUNCTIONS =====
function analyzeAnswers() {
    addMessage("جاري تحليل إجاباتك وتقديم التشخيص المناسب...", 'ai');
    updateProgress(95);
    
    setTimeout(() => {
        const diagnosis = generateDiagnosis(activePart, userAnswers);
        showDiagnosis(diagnosis);
        updateProgress(100);
    }, 2000);
}

function generateDiagnosis(part, answers) {
    const joinedAnswers = answers.join(' ').toLowerCase();
    
    const diagnoses = {
        "Head": {
            mild: {
                ar: "الأعراض تشير إلى صداع التوتر. حاول تقليل الضغط النفسي، وتجنب الجلوس الطويل أمام الشاشات، واحصل على قسط كافٍ من النوم.",
                en: "Symptoms suggest tension headache. Try reducing stress, avoid prolonged screen time, and get adequate sleep.",
                severity: "low"
            },
            moderate: {
                ar: "قد يكون صداع نصفي. تجنب المثيرات مثل الأضواء الساطعة والضوضاء العالية. الراحة في غرفة مظلمة قد تساعد.",
                en: "Possible migraine. Avoid triggers like bright lights and loud noises. Resting in a dark room may help.",
                severity: "medium"
            },
            severe: {
                ar: "الصداع الشديد المفاجئ يحتاج تقييم طبي فوري. راجع الطبيب خاصة إذا صاحبه غثيان أو تشوش في الرؤية.",
                en: "Sudden severe headache requires immediate medical evaluation. See a doctor especially if accompanied by nausea or blurred vision.",
                severity: "high"
            }
        },
        "Chest": {
            mild: {
                ar: "قد يكون ألم عضلي أو التهاب في الغضروف الضلعي. الراحة والكمادات الدافئة قد تساعد.",
                en: "May be muscle pain or costochondritis. Rest and warm compresses may help.",
                severity: "low"
            },
            moderate: {
                ar: "آلام الصدر المتوسطة تحتاج مراقبة. إذا زادت أو صاحبها ضيق تنفس، راجع الطبيب.",
                en: "Moderate chest pain needs monitoring. If it increases or is accompanied by shortness of breath, see a doctor.",
                severity: "medium"
            },
            severe: {
                ar: "آلام الصدر الشديدة مع ضيق التنفس تتطلب رعاية طبية فورية. توجه إلى أقرب مركز طوارئ.",
                en: "Severe chest pain with shortness of breath requires immediate medical attention. Go to the nearest emergency center.",
                severity: "high"
            }
        },
        "Belly": {
            mild: {
                ar: "قد يكون عسر هضم بسيط. تجنب الأطعمة الدسمة وتناول وجبات صغيرة متفرقة.",
                en: "May be simple indigestion. Avoid fatty foods and eat small, frequent meals.",
                severity: "low"
            },
            moderate: {
                ar: "يبدو كالتهاب في المعدة أو القولون. تجنب المنبهات وراجع الطبيب إذا استمر الألم.",
                en: "Appears to be gastritis or colitis. Avoid stimulants and see a doctor if pain persists.",
                severity: "medium"
            },
            severe: {
                ar: "آلام البطن الشديدة المفاجئة تحتاج تقييم طبي فوري خاصة إذا صاحبها حمى أو قيء.",
                en: "Sudden severe abdominal pain requires immediate medical evaluation, especially if accompanied by fever or vomiting.",
                severity: "high"
            }
        },
        "Right Arm": getArmDiagnosis("right"),
        "Left Arm": getArmDiagnosis("left"),
        "Right Leg": getLegDiagnosis("right"),
        "Left Leg": getLegDiagnosis("left"),
        "Back": {
            mild: {
                ar: "شد عضلي بسيط. الراحة والكمادات الدافئة وتمارين الإطالة الخفيفة قد تساعد.",
                en: "Mild muscle strain. Rest, warm compresses, and gentle stretching may help.",
                severity: "low"
            },
            moderate: {
                ar: "ألم ميكانيكي في الظهر. تجنب حمل الأثقال وحسن وضعية الجلوس. قد تحتاج مسكنات بسيطة.",
                en: "Mechanical back pain. Avoid heavy lifting and improve sitting posture. May need simple analgesics.",
                severity: "medium"
            },
            severe: {
                ar: "ألم شديد مع تنميل في الساق قد يشير لانضغاط عصبي. راجع طبيب العظام أو الأعصاب.",
                en: "Severe pain with leg numbness may indicate nerve compression. Consult an orthopedist or neurologist.",
                severity: "high"
            }
        }
    };
    
    let severity = "mild";
    if (joinedAnswers.includes("حاد") || joinedAnswers.includes("شديد") || joinedAnswers.includes("مستمر")) {
        severity = "severe";
    } else if (joinedAnswers.includes("متوسط") || joinedAnswers.includes("يزداد")) {
        severity = "moderate";
    }
    
    const partDiagnoses = diagnoses[part] || diagnoses["Head"];
    const diagnosis = partDiagnoses[severity] || partDiagnoses["mild"];
    
    return {
        part: part,
        diagnosisAr: diagnosis.ar,
        diagnosisEn: diagnosis.en,
        severity: diagnosis.severity,
        date: new Date().toLocaleDateString('ar-SA'),
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };
}

function getArmDiagnosis(side) {
    const sideText = side === "right" ? "الأيمن" : "الأيسر";
    return {
        mild: {
            ar: `شد عضلي بسيط في الذراع ${sideText}. الراحة وتجنب المجهود قد تكفي.`,
            en: `Mild muscle strain in ${side} arm. Rest and avoiding exertion may be sufficient.`,
            severity: "low"
        },
        moderate: {
            ar: `ألم متوسط في الذراع ${sideText}. قد تحتاج لكمادات دافئة ومسكنات بسيطة. إذا استمر راجع الطبيب.`,
            en: `Moderate pain in ${side} arm. May need warm compresses and simple analgesics. If persistent, see a doctor.`,
            severity: "medium"
        },
        severe: {
            ar: `ألم شديد في الذراع ${sideText} خاصة مع التنميل يحتاج تقييم طبي. قد يكون إصابة أو التهاب.`,
            en: `Severe pain in ${side} arm, especially with numbness, requires medical evaluation. Could be injury or inflammation.`,
            severity: "high"
        }
    };
}

function getLegDiagnosis(side) {
    const sideText = side === "right" ? "اليمنى" : "اليسرى";
    return {
        mild: {
            ar: `إجهاد عضلي في الساق ${sideText}. الراحة ورفع الساق قد يساعدان.`,
            en: `Muscle fatigue in ${side} leg. Rest and elevation may help.`,
            severity: "low"
        },
        moderate: {
            ar: `ألم متوسط في الساق ${sideText}. تجنب الوقوف الطويل واستخدم كمادات دافئة.`,
            en: `Moderate pain in ${side} leg. Avoid prolonged standing and use warm compresses.`,
            severity: "medium"
        },
        severe: {
            ar: `ألم شديد في الساق ${sideText} مع تورم يحتاج فحص طبي. قد يكون إصابة أو تجلط.`,
            en: `Severe pain in ${side} leg with swelling requires medical examination. Could be injury or clot.`,
            severity: "high"
        }
    };
}

function showDiagnosis(diagnosis) {
    document.getElementById('diagnosed-part').textContent = diagnosis.part;
    document.getElementById('diagnosis-text-ar').textContent = diagnosis.diagnosisAr;
    document.getElementById('diagnosis-text-en').textContent = diagnosis.diagnosisEn;
    document.getElementById('diagnosis-date').textContent = diagnosis.date;
    document.getElementById('diagnosis-time').textContent = diagnosis.time;
    
    const recsSection = document.getElementById('recommendations-section');
    if (recsSection) {
        recsSection.style.display = isUsingGemini ? 'block' : 'none';
    }
    
    document.querySelectorAll('.severity-level').forEach(level => {
        level.classList.remove('active');
        if (level.getAttribute('data-level') === diagnosis.severity) {
            level.classList.add('active');
        }
    });
    
    document.getElementById('diagnosis-container').style.display = 'flex';
    document.getElementById('chat-box').style.display = 'none';
    
    saveToHistory(diagnosis);
    showNotification('تم إكمال التشخيص بنجاح!', 'success');
}

function saveToHistory(diagnosis) {
    const history = JSON.parse(localStorage.getItem('mediscan_diagnosis_history')) || [];
    
    history.unshift({
        ...diagnosis,
        timestamp: new Date().toISOString(),
        id: Date.now()
    });
    
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem('mediscan_diagnosis_history', JSON.stringify(history));
}

// ===== UTILITY FUNCTIONS =====
function startNewDiagnosis() {
    window.location.href = 'model-selector.html';
}

function printDiagnosis() {
    window.print();
    showNotification('جاري الطباعة...', 'info');
}

function saveDiagnosis() {
    const diagnosis = {
        part: document.getElementById('diagnosed-part').textContent,
        diagnosisAr: document.getElementById('diagnosis-text-ar').textContent,
        diagnosisEn: document.getElementById('diagnosis-text-en').textContent,
        date: document.getElementById('diagnosis-date').textContent,
        time: document.getElementById('diagnosis-time').textContent
    };
    
    localStorage.setItem('lastDiagnosis', JSON.stringify(diagnosis));
    showNotification('تم حفظ التشخيص بنجاح', 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== INITIALIZE STYLES =====
window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 9999;
            transform: translateY(-100px);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .notification-success {
            border-right: 4px solid #10b981;
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        }
        
        .notification-info {
            border-right: 4px solid #3b82f6;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
        }
        
        .notification-error {
            border-right: 4px solid #ef4444;
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
        }
        
        .notification i {
            font-size: 1.25rem;
        }

        .notification span {
            color: #1e293b !important;
            font-weight: 600 !important;
        }
        
        .notification-success i { color: #10b981; }
        .notification-info i { color: #3b82f6; }
        .notification-error i { color: #ef4444; }
    `;
    document.head.appendChild(style);
});