import streamlit as st
from dotenv import load_dotenv
import os
from db import init_db

load_dotenv()
st.set_page_config(
    page_title="Study Buddy",
    layout="wide",
    initial_sidebar_state="expanded",
)
try:
    st.session_state["collapsed"] = False
except Exception:
    pass

GLOBAL_STYLE = """
<style>
/* Base styles - no backdrop-filter allowed */
*, *::before, *::after {
    box-sizing: border-box;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
}

/* hide Streamlit header, toolbar, main menu and footer */
[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer {
    display: none !important;
}
.css-1v3fvcr, .css-1q8run, .css-1pahdxg, .css-1d391kg, .css-1q1n0s1, [data-testid="stToolbar"] {
    display: none !important;
}

/* App background - light neutral */
.stApp {
    background-color: #FAFAF8 !important;
    color: #111827 !important;
}

/* Force sidebar styling */
[data-testid="stSidebar"] {
    visibility: visible !important;
    transform: translateX(0) !important;
    width: 280px !important;
    min-width: 280px !important;
    background-color: #FFFFFF !important;
    border-right: 1px solid #E5E7EB !important;
}
button[title="Hide navigation menu"],
button[title="Show navigation menu"],
[data-testid="collapsedControl"] {
    display: none !important;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    color: #111827 !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
}
p, span, div {
    color: #374151 !important;
    font-family: 'Inter', sans-serif !important;
}

/* Cards - flat white with border */
.card {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 12px !important;
    padding: 20px !important;
    margin: 12px 0 !important;
    box-shadow: none !important;
}

/* Form inputs */
.stTextInput>div>div>input, .stTextArea>div>div>textarea {
    background: #FFFFFF !important;
    color: #111827 !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    border: 1px solid #E5E7EB !important;
    font-family: 'Inter', sans-serif !important;
}
.stTextInput>div>div>input:focus, .stTextArea>div>div>textarea:focus {
    border-color: #4F46E5 !important;
    outline: none !important;
}
.stTextInput>div>div>input::placeholder, .stTextArea>div>div>textarea::placeholder {
    color: #9CA3AF !important;
}

/* Buttons - primary green */
.stButton>button {
    background: #064E3B !important;
    color: #fff !important;
    border-radius: 8px !important;
    padding: 8px 16px !important;
    border: none !important;
    font-weight: 600 !important;
    font-family: 'Inter', sans-serif !important;
    transition: background-color 0.15s !important;
    box-shadow: none !important;
}
.stButton>button:hover {
    background: #065F46 !important;
}
.stButton>button:active {
    transform: none !important;
}

/* Secondary buttons */
.stButton>button[kind="secondary"] {
    background: #FFFFFF !important;
    color: #064E3B !important;
    border: 1px solid #064E3B !important;
}
.stButton>button[kind="secondary"]:hover {
    background: #D1FAE5 !important;
}

/* Radio buttons */
.stRadio>div>div>label {
    color: #374151 !important;
    font-family: 'Inter', sans-serif !important;
}

/* Select boxes */
.stSelectbox>div>div>div {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 8px !important;
    color: #111827 !important;
}

/* Sidebar title */
[data-testid="stSidebar"] h1 {
    color: #064E3B !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 700 !important;
}

/* Sidebar markdown */
[data-testid="stSidebar"] .stMarkdown {
    color: #6B7280 !important;
}

/* Responsive */
@media (max-width: 900px) {
    [data-testid="stSidebar"] { width: 260px !important; min-width: 260px !important; }
    .block-container { padding-left: 16px !important; padding-right: 16px !important; }
}

/* Remove any remaining glass/blur effects */
[data-testid="stAppViewContainer"] {
    background: #FAFAF8 !important;
}
</style>
"""

st.markdown(GLOBAL_STYLE, unsafe_allow_html=True)

try:
    init_db()
except Exception as e:
    st.error(f"Database initialization error: {e}")

st.sidebar.title("Study Buddy")

if "user_id" in st.session_state:
    st.sidebar.markdown(f"**Logged in as:** `{st.session_state.get('username', 'user')}`")
else:
    st.sidebar.markdown("_Not logged in_ (go to **Profile** to log in)")

page = st.sidebar.radio("Navigate", ["Home", "Roadmaps", "Quiz", "Profile"])

with st.sidebar:
    st.markdown("### Settings")
    theme = st.selectbox("Theme", ["Light"], index=0)

with st.container():
    cols = st.columns([1, 3, 1])
    main_col = cols[1]
    with main_col:
        if page == "Home":
            from pages.home import render_home
            render_home()
        elif page == "Roadmaps":
            from pages.roadmaps import render_roadmaps
            render_roadmaps()
        elif page == "Quiz":
            from pages.quiz import render_quiz
            render_quiz()
        elif page == "Profile":
            from pages.profile import render_profile
            render_profile()
