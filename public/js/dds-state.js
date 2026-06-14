(function () {
    const boot = window.DDS_BOOTSTRAP || {};
    const routes = boot.routes || {};
    const state = Object.assign({}, boot.state || {});
    const auth = boot.auth || null;
    const native = window.localStorage;
    const managedKeys = ['dds_', 'mediscan_', 'selected_body_part', 'diagnosis_history', 'lastDiagnosis'];

    window.DDS_AUTH = auth;

    if (auth) {
        state.dds_auth = auth;
        state.mediscan_user = auth;
    }

    function isManaged(key) {
        return managedKeys.some((prefix) => String(key).startsWith(prefix));
    }

    function encode(value) {
        if (typeof value !== 'string') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    function decode(value) {
        if (value === undefined || value === null) {
            return null;
        }

        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    function csrf() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function postState(key, value) {
        if (!routes.state) return;

        fetch(routes.state, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
            body: JSON.stringify({ key, value: encode(value) }),
        }).catch(() => {});
    }

    function deleteState(key) {
        if (!routes.stateDelete) return;

        fetch(routes.stateDelete, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
            body: JSON.stringify({ key }),
        }).catch(() => {});
    }

    const original = {
        getItem: Storage.prototype.getItem,
        setItem: Storage.prototype.setItem,
        removeItem: Storage.prototype.removeItem,
        clear: Storage.prototype.clear,
        key: Storage.prototype.key,
    };

    Storage.prototype.getItem = function (key) {
        if (isManaged(key) && Object.prototype.hasOwnProperty.call(state, key)) {
            return decode(state[key]);
        }

        if (isManaged(key)) {
            return null;
        }

        return original.getItem.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
        if (isManaged(key)) {
            state[key] = encode(value);
            postState(key, value);
            return;
        }

        return original.setItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
        if (isManaged(key)) {
            delete state[key];
            deleteState(key);
            return;
        }

        return original.removeItem.call(this, key);
    };

    Storage.prototype.clear = function () {
        Object.keys(state).forEach((key) => delete state[key]);
        return original.clear.call(this);
    };

    Storage.prototype.key = function (index) {
        const keys = Object.keys(state);
        if (index < keys.length) {
            return keys[index];
        }

        return original.key.call(this, index - keys.length);
    };

    window.DDS_ROUTES = routes;
    window.DDS_STATE = state;
    window.ddsRoute = function (name, fallback) {
        return routes[name] || fallback;
    };
})();
