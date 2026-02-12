import streamlit as st
from openai_client import generate_roadmap_minimal
from db import save_roadmap
def render_home():

    st.markdown(
        """
    <style>
    .huge-brand {
        font-size: 60px !important;  /* Huge font size */
        font-weight: 800;
        letter-spacing: -1px;
        color: #062E03;  /* Emerald green */
        margin-bottom: 16px;
        text-align: center;
    }
    .subtle {
        font-size: 20px !important;
        color: #132A1A !important;
        opacity: 1 !important;
        margin-bottom: 24px;
        text-align: center;
    }
    .header-brand {
        font-size: 24px !important;
        color: #132A1A;
    }
    .result-step {
        font-size: 16px !important;
        color: #e9eef8;
    }
    .footer-note {
        font-size: 14px !important;
        color: #132A1A;
    }
    /* Add subtle animation to card for attractiveness */
    .card {
        animation: fadeIn 1s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    /* Enhance inputs for better look */
    .stTextInput > div > div > input {
        font-size: 16px !important;
        background: rgba(0, 0, 0, 0.6) !important;
    }
    /* Add icon to button for extra appeal */
    .stButton > button::before {
        content: '🚀 ';  /* Emoji icon */
    }
    </style>
    """,
        unsafe_allow_html=True,
    )

  
    st.markdown("<div class='huge-brand'>STUDY Buddy</div>", unsafe_allow_html=True)

  
    if "user_id" in st.session_state:
        subtle_text = (
            "Type your learning goal and press **Generate roadmap**. "
            "Roadmaps will be saved automatically to your profile."
        )
    else:
        subtle_text = (
            "Type your learning goal and press **Generate roadmap**. "
            "You are currently **not logged in**, so this roadmap will not be saved. "
            "Go to the **Profile** tab to create an account."
        )

    st.markdown(
        f"<div class='subtle'>{subtle_text}</div>", unsafe_allow_html=True
    )

   
    with st.form("gen_form"):
        goal = st.text_input(
            "Learning goal (e.g. 'Learn Python for data analysis in 6 weeks')",
            value="",
            help="Be specific for better results!",
        )
        title = st.text_input(
            "Title (short, optional)",
            value="",
            help="Give your roadmap a catchy name.",
        )
        submitted = st.form_submit_button("Generate roadmap")

    if submitted:
        if not goal.strip():
            st.warning("Please provide a learning goal.")
            st.markdown("</div>", unsafe_allow_html=True)
            return

        with st.spinner("Generating concise 6-step roadmap..."):
            result = generate_roadmap_minimal(goal)

        if "error" in result:
            st.error(f"Generation failed: {result.get('error')}")
            if result.get("detail"):
                st.text(result["detail"])
            st.markdown("</div>", unsafe_allow_html=True)
            return

        t = result.get("title") or (title or goal[:36])
        steps = result.get("steps") or []
        sources = result.get("sources") or []

   
        if len(steps) < 6:
            steps += ["(short step)"] * (6 - len(steps))
        elif len(steps) > 6:
            steps = steps[:6]

        
        user_id = st.session_state.get("user_id")
        if user_id is not None:
            save_roadmap(t, goal, steps, sources, user_id=user_id)
            st.success(
                "Roadmap saved to your account. You can view it in the Roadmaps tab."
            )
        else:
            st.info(
                "You are not logged in, so this roadmap was **not** saved. "
                "Log in via the Profile tab to save future roadmaps."
            )
        st.markdown(
            f"<div class='header-brand' style='margin-top:24px; text-align:center;'>{t}</div>",
            unsafe_allow_html=True,
        )
        for i, s in enumerate(steps, start=1):
            st.markdown(
                f"<div class='result-step'><strong>Step {i}.</strong> {s}</div>",
                unsafe_allow_html=True,
            )

        if sources:
            st.markdown(
                "<div style='margin-top:16px; font-weight:600; "
                "color:#132A1A; text-align:center;'>Sources</div>",
                unsafe_allow_html=True,
            )
            for src in sources:
                st.markdown(
                    f"- <a href='{src}' target='_blank' style='color:#00FF7F'>{src}</a>",
                    unsafe_allow_html=True,
                )

        st.markdown(
            "<div class='footer-note' style='text-align:center;'>"
            "Saved roadmaps appear in the **Roadmaps** tab. "
            "Tip: keep goals short & specific for best results."
            "</div>",
            unsafe_allow_html=True,
        )
    st.markdown(
        "<div style='text-align:center; margin-top:32px; font-style:italic; "
        "color:#A5D6A7;'>'The journey of a thousand miles begins with a single step.' "
        "- Start your learning adventure!</div>",
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)  
