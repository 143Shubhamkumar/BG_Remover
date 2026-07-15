# 🌟 AI Background Remover & Magic Eraser

A modern, fast, and feature-rich web application that allows users to instantly remove image backgrounds, add custom backgrounds, adjust edge smoothness, apply drop shadows, and erase objects/blemishes (inpainting) using AI.

---

## 🚀 Features

-   **AI Background Removal**: Automatically detect and separate subjects from their backgrounds using the state-of-the-art `isnet-general-use` model.
-   **Magic Eraser (Inpainting)**: Brush over objects, text, or blemishes to erase them seamlessly using OpenCV's inpainting algorithms.
-   **Edge Smoothness Control**: Fine-tune alpha matting thresholds to get smooth and crisp edges for complex subjects (e.g., hair).
-   **Custom Backgrounds**: Instantly swap the removed background with a solid color of your choice.
-   **Drop Shadows**: Add a customizable, blurred drop shadow effect to give subjects depth and dimension.
-   **Safe Image Resizing**: Built-in server protection to handle high-resolution files gracefully.

---

## 🛠️ Tech Stack

### Backend
-   **FastAPI**: Modern, fast (high-performance) web framework for building APIs with Python.
-   **Rembg**: Library for background removal based on the U<sup>2</sup>-Net model.
-   **OpenCV & NumPy**: Powering image manipulation and the Magic Eraser (inpainting) tool.
-   **Pillow (PIL)**: Python Imaging Library for advanced image compositing, shadows, and alpha channel operations.

### Frontend
-   **React 19 & TypeScript**: Component-driven UI framework with static typing.
-   **Vite**: Next-generation frontend tooling for fast development builds.
-   **Tailwind CSS v4**: Utility-first CSS styling for a responsive, modern interface.
-   **Lucide Icons**: Clean and consistent vector icons.

---

## ⚙️ Installation & Setup

To run this application locally, you will need to start both the Python backend and the React frontend.

### 1. Prerequisites
-   [Python 3.8+](https://www.python.org/downloads/)
-   [Node.js (v18+)](https://nodejs.org/)

### 2. Backend Setup
1.  Navigate to the root directory of the project.
2.  Create and activate a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the FastAPI backend server using Uvicorn:
    ```bash
    uvicorn main:app --reload
    ```
    *The API will be running at:* `http://127.0.0.1:8000`

### 3. Frontend Setup
1.  Navigate to the `frontend/` directory:
    ```bash
    cd frontend
    ```
2.  Install the npm dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```
    *The web application will be running locally at:* `http://localhost:5173` (or the URL printed in your terminal).

---

## 📂 Project Structure

```text
MyBGRemover/
├── main.py                 # FastAPI backend server logic
├── requirements.txt         # Python backend dependencies
├── .gitignore              # Files to ignore in root repository
├── README.md               # Project documentation (this file)
└── frontend/               # React frontend project
    ├── index.html          # HTML entry point
    ├── vite.config.ts      # Vite configuration
    ├── package.json        # Frontend dependencies & scripts
    ├── src/                # React source code
    │   ├── App.tsx         # Main UI layout & state management
    │   ├── main.tsx        # React entry file
    │   ├── App.css         # Custom frontend styles
    │   └── index.css       # Global styles (Tailwind imports)
    └── public/             # Static public assets
```

---

## 📝 License
This project is open-source and available under the MIT License.
