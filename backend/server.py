# TERMINAL_KAIMA - Flask Backend Server
# Task 2 이후 구현 예정

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
