from groq import Groq

from app.config.settings import GROQ_API_KEY


class GroqService:

    def __init__(self):

        self.client = Groq(
            api_key=GROQ_API_KEY
        )

    def chat(self, prompt: str):

        completion = self.client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role": "system",
                    "content": "You are an expert fact-checking assistant."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=0.2,
        )

        return completion.choices[0].message.content