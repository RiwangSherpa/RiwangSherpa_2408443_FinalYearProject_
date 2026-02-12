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
        

UNSPLASH_BG = "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

GLOBAL_STYLE = f"""
<style>
/* hide Streamlit header, toolbar, main menu and footer */
[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer {{
    display: none !important;
}}
.css-1v3fvcr, .css-1q8run, .css-1pahdxg, .css-1d391kg, .css-1q1n0s1, [data-testid="stToolbar"] {{
    display: none !important;
}}
/* Force sidebar to stay open and remove collapse toggle */
[data-testid="stSidebar"] {{
    visibility: visible !important;
    transform: translateX(0) !important;
    width: 320px !important;
    min-width: 320px !important;
}}
button[title="Hide navigation menu"],
button[title="Show navigation menu"],
[data-testid="collapsedControl"] {{
    display: none !important;
}}

.stApp {{
    position: relative;
    overflow: hidden;
}}
.stApp::before {{
    content: "";
    position: fixed;
    inset: 0;
    background-image: url('{UNSPLASH_BG}');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    filter: saturate(0.9) brightness(0.6);
    z-index: 0;
    pointer-events: none;
}}

[data-testid="stAppViewContainer"], .css-18e3th9, .block-container {{
    position: relative;
    z-index: 1;
}}
section[data-testid="stSidebar"] {{
    background: rgba(0, 20, 10, 0.6) !important;
    backdrop-filter: blur(8px) saturate(120%);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
}}

.card {{
    backdrop-filter: blur(6px) saturate(120%);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.45);
    margin: 18px 12px;
}}
.stTextInput>div>div>input, .stTextArea>div>div>textarea {{
    background: rgba(0,0,0,0.45) !important;
    color: #fff !important;
    border-radius: 10px !important;
    padding: 10px !important;
    border: 1px solid rgba(255,255,255,0.04) !important;
}}
.stButton>button {{
    background: linear-gradient(90deg,#4CAF50,#66BB6A) !important;
    color: #fff !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    box-shadow: 0 6px 16px rgba(76,175,80,0.12);
}}
@media (max-width: 900px) {{
    [data-testid="stSidebar"] {{ width: 260px !important; min-width: 260px !important; }}
    .block-container {{ padding-left: 16px !important; padding-right: 16px !important; }}
}}
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
    theme = st.selectbox("Theme", ["Dark Nature", "Light", "Custom"], index=0)

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
