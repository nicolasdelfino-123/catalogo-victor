from app import create_app, db
from flask import send_from_directory, make_response
import os

app = create_app()

@app.route("/")
def serve_frontend():
    response = make_response(
        send_from_directory(app.static_folder, "index.html")
    )
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/<path:path>')
def serve_static_files(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        response = make_response(
            send_from_directory(app.static_folder, "index.html")
        )
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)