# Human-3D

## Overview

Human-3D is an intelligent web application developed using Laravel and Blade templates with JavaScript. The system helps users identify possible diseases and health conditions through an interactive 3D human model and an AI-powered chatbot.

Users can select the area where they feel pain on the 3D model, then answer a series of questions provided by the chatbot. Based on the user's responses, the system analyzes the symptoms and provides the most appropriate diagnosis.

---

## Features

* Interactive 3D human body model.
* Pain area selection.
* AI chatbot for symptom collection.
* Disease prediction based on user responses.
* User-friendly interface.
* Developed using Laravel and JavaScript.

---

## Technologies Used

* PHP
* Laravel
* Blade Templates
* JavaScript
* HTML
* CSS
* MySQL

---

## Installation Instructions

### 1. Clone the repository

```bash
git clone https://github.com/NourEldein-dev/human-3d.git
```

### 2. Navigate to the project directory

```bash
cd human-3d
```

### 3. Install Composer dependencies

```bash
composer install
```

### 4. Create the environment file

```bash
cp .env.example .env
```

### 5. Configure the database

Create a MySQL database and update the database credentials inside the .env file according to your local environment.

Example:

DB_DATABASE=your_database_name
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password

### 6. Generate the application key

```bash
php artisan key:generate
```

### 7. Run database migrations

```bash
php artisan migrate
```

### 8. Start the development server

```bash
php artisan serve
```

Open the following URL in your browser:

```
http://127.0.0.1:8000
```

---

## Project Documentation

The complete documentation can be found in the `documentation` folder.

---

## Presentation

The project presentation slides are available in the `presentation` folder.

---

## Demo Video

The demonstration video is available in the `demo` folder.

---

## Authors

Graduation Project Team
