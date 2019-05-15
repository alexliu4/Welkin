
from flask import Flask, render_template, session, request, url_for, redirect, flash
from util import db
import os


app = Flask(__name__)
app.secret_key = os.urandom(32)

@app.route("/")
def home():
    return render_template("home.html")

if __name__ == "__main__":
    app.debug = True
    app.run()
