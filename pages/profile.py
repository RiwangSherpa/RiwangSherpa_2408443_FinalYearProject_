import streamlit as st
import hashlib
from db import (
    load_user,
    save_user,
    create_user,
    get_user_by_username,
)
def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()
def render_profile():
    if "user_id" not in st.session_state:
        st.header("Account • Login / Sign up")

        mode = st.radio("Choose action", ["Login", "Register"], horizontal=True)

        if mode == "Login":
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")

            if st.button("Login"):
                user = get_user_by_username(username)
                if user and user["password_hash"] == _hash_password(password):
                    st.session_state["user_id"] = user["id"]
                    st.session_state["username"] = user["username"]
                    st.success(f"Logged in as {user['username']}")
                    st.rerun()
                else:
                    st.error("Invalid username or password.")

        else:  
            username = st.text_input("Choose a username")
            password = st.text_input("Choose a password", type="password")
            confirm = st.text_input("Confirm password", type="password")

            if st.button("Create account"):
                if not username or not password:
                    st.error("Username and password are required.")
                elif password != confirm:
                    st.error("Passwords do not match.")
                elif get_user_by_username(username):
                    st.error("That username is already taken.")
                else:
                    user_id = create_user(username, _hash_password(password))
                    st.session_state["user_id"] = user_id
                    st.session_state["username"] = username
                    st.success("Account created and logged in.")
                    st.rerun()

        st.markdown("</div>", unsafe_allow_html=True)
        return

    st.header("Your Profile")

    user_id = st.session_state["user_id"]
    profile = load_user(user_id)

    with st.form("profile"):
        name = st.text_input("Name", value=profile.get("name", ""))
        email = st.text_input("Email", value=profile.get("email", ""))
        bio = st.text_area(
            "Bio / short description", value=profile.get("bio", "")
        )
        saved = st.form_submit_button("Save profile")

    if saved:
        save_user(user_id, name, email, bio)
        st.success("Profile saved.")

    if profile.get("updated_at"):
        st.markdown(f"*Last updated: {profile['updated_at']}*")

    if st.button("Logout"):
        st.session_state.pop("user_id", None)
        st.session_state.pop("username", None)
        st.success("Logged out.")
        st.rerun()

    st.markdown("</div>", unsafe_allow_html=True)
