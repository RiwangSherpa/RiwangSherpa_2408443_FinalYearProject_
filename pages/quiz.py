import streamlit as st
from db import (
    list_roadmaps,
    save_quiz,
    list_quizzes,
    get_quiz,
    save_quiz_attempt,
    list_attempts_for_quiz,
    load_user,
)
from openai_client import generate_quiz_minimal
import traceback

def _current_user_profile():
    uid = st.session_state.get("user_id")
    if uid:
        try:
            return load_user(uid)
        except Exception:
            return {"name": ""}
    return {"name": ""}

def render_quiz():
    st.header("Quiz Playground")

    try:
        col1, col2 = st.columns([2, 1])
        with col1:
            st.subheader("Create quiz from a roadmap")
            rms = list_roadmaps()
            if not rms:
                st.info("No roadmaps available yet. Create one on the Home page first.")
            roadmap_options = {f"{r['id']} - {r['title'] or r['goal']}": r for r in rms}
            choice = st.selectbox("Pick a roadmap to base quiz on", [""] + list(roadmap_options.keys()))
            num_q = st.slider("Number of questions", 3, 10, 5)
            if st.button("Generate quiz from roadmap"):
                if not choice:
                    st.warning("Select a roadmap first.")
                else:
                    r = roadmap_options[choice]
                    topic = r.get("title") or r.get("goal") or "General"
                    with st.spinner("Generating quiz..."):
                        result = generate_quiz_minimal(topic, num_questions=num_q)
                        if isinstance(result, dict) and result.get("error"):
                            st.error(f"Generation failed: {result.get('error')}")
                            if result.get("raw") or result.get("detail"):
                                st.text(result.get("raw") or result.get("detail"))
                        else:
                            title = result.get("title") or f"Quiz: {topic[:30]}"
                            questions = result.get("questions") or []
                            sanitized = []
                            for q in questions[:num_q]:
                                if isinstance(q, dict) and "q" in q and "options" in q and "answer_index" in q:
                                    sanitized.append({
                                        "q": q["q"],
                                        "options": q["options"],
                                        "answer_index": int(q["answer_index"]),
                                    })
                            if not sanitized:
                                st.error("Model returned invalid quiz structure.")
                            else:
                                qid = save_quiz(title, r["id"], sanitized)
                                st.success(f"Quiz saved (id={qid})")

        with col2:
            st.subheader("Saved quizzes")
            quizzes = list_quizzes()
            if not quizzes:
                st.info("No saved quizzes yet.")
            quiz_map = {f"{q['id']} - {q['title']}": q for q in quizzes}
            sel = st.selectbox("Pick a saved quiz", [""] + list(quiz_map.keys()))
            if sel:
                q = quiz_map[sel]
                st.markdown(f"**{q['title']}**")
                for i, qq in enumerate(q["questions"], start=1):
                    st.markdown(f"{i}. {qq['q']}")
                    for oi, opt in enumerate(qq["options"]):
                        st.markdown(f"- {opt}")
                st.markdown(f"*Created at: {q['created_at']}*")

        st.markdown("---")
        st.subheader("Play quiz")
        quizzes = list_quizzes()
        if not quizzes:
            st.info("No quizzes to play yet. Generate one first.")
        play_map = {f"{q['id']} - {q['title']}": q for q in quizzes}
        play_choice = st.selectbox("Choose quiz to play", [""] + list(play_map.keys()), key="play_select")
        if play_choice:
            quiz = play_map[play_choice]
            st.markdown(f"### {quiz['title']}")
            current_user = _current_user_profile()
            name = current_user.get("name") or st.text_input("Your name (optional)", value="")
            answers = []
            for idx, qq in enumerate(quiz["questions"]):
                st.markdown(f"**Q{idx+1}. {qq['q']}**")
                opts = qq.get("options", [])
                choice_idx = st.radio(
                    f"Select answer {idx}",
                    list(range(len(opts))),
                    format_func=(lambda i, o=opts: o[i]),
                    key=f"q_{quiz['id']}_{idx}"
                )
                answers.append(int(choice_idx))
            if st.button("Submit answers"):
                correct = 0
                total = len(quiz["questions"])
                for ai, qq in zip(answers, quiz["questions"]):
                    if ai == int(qq.get("answer_index", -1)):
                        correct += 1
                score = correct
                user_name = name or current_user.get("name") or "Anonymous"
                try:
                    save_quiz_attempt(quiz["id"], user_name, answers, score, total)
                except Exception as e:
                    st.warning("Could not save attempt to DB: " + str(e))
                st.success(f"You scored {score}/{total} ({(score/total)*100:.1f}%)")

        st.markdown("---")
        st.subheader("Scoreboard")
        quizzes_for_board = list_quizzes()
        if not quizzes_for_board:
            st.info("No quizzes yet.")
        quiz_map_board = {f"{q['id']} - {q['title']}": q for q in quizzes_for_board}
        scoreboard_quiz = st.selectbox("Select quiz for scoreboard", [""] + list(quiz_map_board.keys()), key="score_select")
        if scoreboard_quiz:
            qid = int(scoreboard_quiz.split(" - ")[0])
            attempts = list_attempts_for_quiz(qid)
            if not attempts:
                st.info("No attempts yet for this quiz.")
            else:
                for a in attempts:
                    st.markdown(f"- **{a['user_name'] or 'Anonymous'}** scored **{a['score']}/{a['total']}** — {a['created_at']}")

    except Exception:
        st.error("An error occurred on the Quiz page. See details below.")
        st.text(traceback.format_exc())

    st.markdown("</div>", unsafe_allow_html=True)
