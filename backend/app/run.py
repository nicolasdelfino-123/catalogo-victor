from app import create_app, db
from flask import send_from_directory, make_response
import os
from app.social_preview import is_social_crawler, render_product_social_preview

app = create_app()

def serve_frontend_index():
    response = make_response(
        send_from_directory(app.static_folder, "index.html")
    )
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/")
def serve_frontend():
    return serve_frontend_index()

@app.route("/product/<int:product_id>")
def serve_product_page(product_id):
    if is_social_crawler():
        return render_product_social_preview(product_id)
    return serve_frontend_index()

@app.route("/mayorista/product/<int:product_id>")
def serve_wholesale_product_page(product_id):
    if is_social_crawler():
        return render_product_social_preview(product_id, wholesale=True)
    return serve_frontend_index()

@app.route('/<path:path>')
def serve_static_files(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return serve_frontend_index()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
