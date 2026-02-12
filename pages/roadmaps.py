import streamlit as st
from db import list_roadmaps, get_roadmap
def render_roadmaps():
    st.header("Saved Roadmaps")

    if "user_id" not in st.session_state:
        st.info("Please log in on the Profile page to see your roadmaps.")
        st.markdown("</div>", unsafe_allow_html=True)
        return

    user_id = st.session_state["user_id"]

    rms = list_roadmaps(user_id=user_id)
    if not rms:
        st.info("No saved roadmaps yet. Generate one from Home.")
    else:
        col1, col2 = st.columns([2, 1])
        with col1:
            for r in rms:
                with st.expander(
                    f"{r['title']} — created {r['created_at'][:19]}",
                    expanded=False,
                ):
                    st.markdown(f"**Goal:** {r['goal']}")
                    st.markdown("**Steps:**")
                    for idx, s in enumerate(r["steps"], start=1):
                        st.markdown(f"{idx}. {s}")
                    if r["sources"]:
                        st.markdown("**Sources:**")
                        for src in r["sources"]:
                            st.markdown(f"- {src}")
        with col2:
            st.markdown("### Quick view")
            sel = st.selectbox(
                "Select roadmap to preview",
                [""] + [f"{r['id']} - {r['title']}" for r in rms],
            )
            if sel:
                rid = int(sel.split(" - ")[0])
                r = get_roadmap(rid, user_id=user_id)
                if r:
                    st.markdown(f"**{r['title']}**")
                    st.markdown(f"*Goal:* {r['goal']}")
                    for i, s in enumerate(r["steps"], start=1):
                        st.markdown(f"**Step {i}.** {s}")
                    if r["sources"]:
                        st.markdown("**Sources:**")
                        for src in r["sources"]:
                            st.markdown(f"- {src}")
    st.markdown("</div>", unsafe_allow_html=True)
