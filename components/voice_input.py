import streamlit.components.v1 as components

def voice_input():
    components.html(
        """
        <button onclick="startDictation()" style="
            padding:8px 14px;
            border-radius:10px;
            border:none;
            background:#4CAF50;
            color:white;
            cursor:pointer;
            font-size:14px;
        ">🎤 Speak</button>

        <script>
        function startDictation() {
          if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this browser");
            return;
          }

          const recognition = new webkitSpeechRecognition();
          recognition.lang = "en-US";
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          recognition.onresult = function(event) {
            const text = event.results[0][0].transcript;
            window.parent.postMessage(
              { type: "VOICE_TEXT", value: text },
              "*"
            );
          };

          recognition.start();
        }
        </script>
        """,
        height=60,
    )
