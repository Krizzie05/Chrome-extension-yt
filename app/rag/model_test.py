import ollama

response = ollama.chat(model='mistral:7b', messages=[
    {'role': 'user', 'content': 'Explain overfitting in one sentence'}
])
print(response['message']['content'])

