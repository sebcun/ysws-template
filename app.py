import os
from flask import Flask, render_template, redirect, request, session, jsonify, url_for
from urllib.parse import urlparse
import requests
from datetime import timedelta
import db
import admin_db
import slack
from dotenv import load_dotenv
import json
from pathlib import Path

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("APP_SECRET", os.urandom(24))

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
AUTH_URL = "https://auth.hackclub.com/oauth/authorize"
TOKEN_URL = "https://auth.hackclub.com/oauth/token"
JWKS_URL = "https://auth.hackclub.com/oauth/discovery/keys"
USERINFO_URL = "https://auth.hackclub.com/oauth/userinfo"

DEFAULT_SITE_CONFIG = {
  "home": {
    "title": "YSWS Template",
    "description": "description of the YSWS"
  },
  "colors": {
    "primary": "#3b82f6",
    "primary_rgb": "59, 130, 246",
    "primary_hover": "#60a5fa",
    "bg": "#0b0f14",
    "bg_secondary": "#141b26",
    "bg_surface": "#171f2b",
    "text": "#e5e7eb",
    "text_strong": "#ffffff",
    "hero_grad_rbg": "30, 64, 175"
  }
}

ADMIN_EMAILS = os.getenv("ORGS", "").split(",")
REVIEWER_EMAILS = os.getenv("ORGS", "").split(",")

def load_site_config():
    config_path = Path(__file__).parent / "config.json"
    if not config_path.exists():
        config_path.write_text(json.dumps(DEFAULT_SITE_CONFIG, indent=2))
        print(f"Created default config at {config_path}")
        return DEFAULT_SITE_CONFIG
    try:
        return json.loads(config_path.read_text())
    except Exception as e:
        print(f"Invalid config.json ({e}); recreating with default config.")
        config_path.write_text(json.dumps(DEFAULT_SITE_CONFIG, indent=2))
        return DEFAULT_SITE_CONFIG
   
SITE_CONFIG = load_site_config()
    
db.init_db()
admin_db.init_db()


def get_current_user(clear_stale=True):
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = db.get_user_by_id(user_id)
    if not user and clear_stale:
        session.pop("user_id", None)
        session.pop("email", None)
        session.pop("slack_id", None)
        session.pop("nickname", None)
        return None
    is_admin = bool(
        (user.get("email") in ADMIN_EMAILS) or (user.get("slack_id") in ADMIN_EMAILS)
    )
    is_reviewer = bool((user.get("slack_id") in REVIEWER_EMAILS) or is_admin)
    user_with_roles = dict(user)
    user_with_roles["is_admin"] = is_admin
    user_with_roles["is_reviewer"] = is_reviewer
    return user_with_roles


@app.context_processor
def inject_current_user():
    return {"current_user": get_current_user()}

@app.context_processor
def inject_site():
    return {"site": SITE_CONFIG}


# GET /
@app.route("/")
def index():
    return render_template("index.html")


# GET /login
@app.route("/login")
def login():
    user = get_current_user()
    if user:
        return redirect(url_for("dashboard"))
    parsed = urlparse(request.url_root)
    if parsed.hostname not in ["localhost", "127.0.0.1", "0.0.0.0"]:
        redirect_uri = "https://" + parsed.netloc + "/auth/callback"
    else:
        redirect_uri = request.url_root.rstrip("/") + "/auth/callback"
    auth_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid profile email slack_id verification_status",
    }
    auth_url = f"{AUTH_URL}?{'&'.join([f'{k}={v}' for k, v in auth_params.items()])}"
    return redirect(auth_url)


# GET /auth/callback
@app.route("/auth/callback")
def auth_callback():
    code = request.args.get("code")
    if not code:
        return "Error: No code received", 400
    parsed = urlparse(request.url_root)
    if parsed.hostname not in ["localhost", "127.0.0.1", "0.0.0.0"]:
        redirect_uri = "https://" + parsed.netloc + "/auth/callback"
    else:
        redirect_uri = request.url_root.rstrip("/") + "/auth/callback"
    token_data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "code": code,
        "grant_type": "authorization_code",
    }
    token_response = requests.post(TOKEN_URL, data=token_data)
    if token_response.status_code != 200:
        return "Error: Failed to get tokens", 400
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    if not access_token:
        return "Error: No access token", 400
    headers = {"Authorization": f"Bearer {access_token}"}
    userinfo_response = requests.get(USERINFO_URL, headers=headers)
    if userinfo_response.status_code != 200:
        return "Error: Failed to get user info", 400
    userinfo = userinfo_response.json()
    if userinfo.get("verification_status") != "verified" or not userinfo.get(
        "ysws_eligible"
    ):
        return redirect("/unauthorized")
    email = userinfo.get("email")
    nickname = userinfo.get("nickname") or userinfo.get("name")
    slack_id = userinfo.get("slack_id")
    user_id = db.get_or_create_user(email, nickname, slack_id)
    session["user_id"] = user_id
    session["slack_id"] = slack_id
    session["email"] = email
    session["nickname"] = nickname
    return redirect(url_for("dashboard"))


# GET /logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# GET /unauthorized
@app.route("/unauthorized")
def unauthorized():
    return render_template("unauthorized.html"), 403


# GET /dash
@app.route("/dash")
def dashboard():
    user = get_current_user()
    if not user:
        return redirect(url_for("login"))

    return render_template("dashboard.html")


# GET /admin
@app.route("/admin")
def admin():
    user = get_current_user()
    if not user:
        return redirect(url_for("login"))

    if not user["is_admin"]:
        return redirect(url_for("unauthorized"))

    return render_template("admin.html")


# GET /reviewer
@app.route("/reviewer")
def reviewer():
    user = get_current_user()
    if not user:
        return redirect(url_for("login"))

    if not user["is_reviewer"]:
        return redirect(url_for("unauthorized"))

    return render_template("reviewer.html")


# GET /api/projects
@app.route("/api/projects", methods=["GET"])
def get_projects():
    if request.args.get("me"):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        slack_id = user.get("slack_id")
        hackatime_response = requests.get(
            f"https://hackatime.hackclub.com/api/v1/users/{slack_id}/stats?limit=1000&features=projects&start_date=2025-12-16"
        ).json()
        projects = db.get_user_projects(user["id"])
        hackatime_projects = hackatime_response.get("data", {}).get("projects", [])
        projects_with_hours = []

        for proj in projects:
            project_id = proj["id"]
            status = proj.get("status")
            if status in ["Shipped", "Pending Review"]:
                total_hours = proj["hours"] if proj["hours"] else 0
                total_seconds = total_hours * 3600
            else:
                hackatime_project_names = (
                    proj["hackatime_project"] if proj["hackatime_project"] else ""
                )
                total_seconds = 0
                if hackatime_project_names:
                    project_names = [
                        name.strip() for name in hackatime_project_names.split(",")
                    ]
                    for project_name in project_names:
                        for hp in hackatime_projects:
                            if hp.get("name") == project_name:
                                total_seconds += hp.get("total_seconds", 0)
                                break
                total_hours = total_seconds / 3600.0
                stored_hours = proj["hours"] if proj["hours"] else 0
                if abs(stored_hours - total_hours) > 0.01:
                    db.update_project_hours(project_id, total_hours)
                    proj["hours"] = total_hours

            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            seconds = int(total_seconds % 60)
            digital_format = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            project_with_hours = dict(proj)
            project_with_hours["digital_hours"] = digital_format
            projects_with_hours.append(project_with_hours)

        return jsonify({"projects": projects_with_hours})

    status_q = request.args.get("status")
    author_q = request.args.get("author")

    if status_q:
        key = "".join(ch for ch in status_q.lower() if ch.isalnum())
        status_map = {
            "building": "Building",
            "shipped": "Shipped",
            "pending": "Pending Review",
            "pendingreview": "Pending Review",
        }
        if key not in status_map:
            return jsonify({"error": "Invalid status filter"}), 400
        status_q = status_map[key]

    projects = db.get_all_projects(status_q) if status_q else db.get_all_projects()

    if author_q:
        projects = [p for p in projects if p.get("slack_id") == author_q]

    public_projects = []
    for proj in projects:
        proj_public = dict(proj)
        proj_public.pop("nickname", None)
        proj_public.pop("email", None)
        total_seconds = int((proj_public.get("hours") or 0) * 3600)
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = int(total_seconds % 60)
        proj_public["digital_hours"] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        public_projects.append(proj_public)
    return jsonify({"projects": public_projects})


# GET /api/hackatime
@app.route("/api/hackatime")
def get_hackatime():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    slack_id = user.get("slack_id")

    hackatime_response = requests.get(
        f"https://hackatime.hackclub.com/api/v1/users/{slack_id}/stats?limit=1000&features=projects&start_date=2025-12-16"
    ).json()
    return jsonify(hackatime_response)


# POST /api/projects
@app.route("/api/projects", methods=["POST"])
def create_project():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    hackatime_str = (data.get("hackatime_project") or "").strip()
    desired_names = [n.strip() for n in hackatime_str.split(",") if n.strip()]
    conflicts = db.check_hackatime_projects_available(user["id"], desired_names)

    if conflicts:
        return (
            jsonify(
                {"error": "Hackatime project(s) already linked", "conflicts": conflicts}
            ),
            400,
        )

    project_id = db.create_project(
        user_id=user["id"],
        title=data.get("title"),
        description=data.get("description"),
        demo_link=data.get("demo_link"),
        github_link=data.get("github_link"),
        hackatime_project=data.get("hackatime_project"),
    )
    return jsonify({"success": True, "project_id": project_id}), 201


# GET /api/projects/<int:project_id>
@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    project = db.get_project_by_id(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    if project["user_id"] != user["id"] and not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify(project)


# PUT /api/projects/<int:project_id>
@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    project = db.get_project_by_id(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    data = request.get_json() or {}

    if user["is_admin"]:
        pass
    elif user["is_reviewer"]:
        non_status_keys = [k for k in data.keys() if k != "status"]
        if non_status_keys:
            return jsonify({"error": "Reviewers can only update status"}), 403
        if "status" not in data:
            return jsonify({"error": "Status required"}), 400
        success = db.update_project(project_id=project_id, status=data.get("status"))
        return jsonify({"success": success})
    else:
        if not db.check_project_owner(project_id, user["id"]):
            return jsonify({"error": "Unauthorized"}), 403
        if project.get("status") in ["Pending Review", "Shipped"]:
            return (
                jsonify(
                    {
                        "error": "Cannot edit project with status Pending Review or Shipped"
                    }
                ),
                403,
            )
    hours_to_update = None

    if data.get("status") == "Pending Review":
        try:
            owner = db.get_user_by_id(project["user_id"])
            slack_id = owner.get("slack_id") if owner else None
            ht_names = data.get("hackatime_project")
            if ht_names is None:
                curr = db.get_project_by_id(project_id)
                if curr:
                    ht_names = curr.get("hackatime_project", "")
            if ht_names and slack_id:
                hackatime_response = requests.get(
                    f"https://hackatime.hackclub.com/api/v1/users/{slack_id}/stats?limit=1000&features=projects&start_date=2025-12-16"
                ).json()
                hackatime_projects = hackatime_response.get("data", {}).get(
                    "projects", []
                )
                project_names = [n.strip() for n in ht_names.split(",")]
                total_seconds = 0
                for project_name in project_names:
                    for hp in hackatime_projects:
                        if hp.get("name") == project_name:
                            total_seconds += hp.get("total_seconds", 0)
                            break
                hours_to_update = total_seconds / 3600.0
        except Exception as e:
            print(f"Error syncing hours on submit: {e}")

    if "hackatime_project" in data and not user["is_reviewer"]:
        ht_str = (data.get("hackatime_project") or "").strip()
        desired_names = [n.strip() for n in ht_str.split(",") if n.strip()]
        conflicts = db.check_hackatime_projects_available(
            project["user_id"], desired_names, exclude_project_id=project_id
        )
        if conflicts:
            return (
                jsonify(
                    {
                        "error": "Hackatime project(s) already linked",
                        "conflicts": conflicts,
                    }
                ),
                400,
            )

    success = db.update_project(
        project_id=project_id,
        title=data.get("title"),
        description=data.get("description"),
        demo_link=data.get("demo_link"),
        github_link=data.get("github_link"),
        hackatime_project=data.get("hackatime_project"),
        hours=hours_to_update,
        status=data.get("status"),
    )
    return jsonify({"success": success})


# DELETE /api/projects/<int:project_id>
@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    project = db.get_project_by_id(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    if not (user["is_admin"] or db.check_project_owner(project_id, user["id"])):
        return jsonify({"error": "Unauthorized"}), 403

    if project.get("status") in ["Pending Review", "Shipped"] and not user["is_admin"]:
        return (
            jsonify(
                {"error": "Cannot delete project with status Pending Review or Shipped"}
            ),
            403,
        )
    success = db.delete_project(project_id)

    return jsonify({"success": success})


# PATCH /api/projects/<int:project_id>/status
@app.route("/api/projects/<int:project_id>/status", methods=["PATCH"])
def update_project_status(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    status = data.get("status")
    if not status:
        return jsonify({"error": "Status required"}), 400
    success = db.update_project_status(project_id, status)

    return jsonify({"success": success})


# GET /api/user/profile
@app.route("/api/user/profile", methods=["GET"])
def get_user_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    project_count = db.count_projects(user["id"])
    total_hours = db.get_total_hours(user["id"])

    return jsonify(
        {"user": user, "project_count": project_count, "total_hours": total_hours}
    )


# PUT /api/user/profile
@app.route("/api/user/profile", methods=["PUT"])
def update_user_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    success = db.update_user(
        user_id=user["id"], nickname=data.get("nickname"), slack_id=data.get("slack_id")
    )

    if success and data.get("nickname"):
        session["nickname"] = data.get("nickname")
    return jsonify({"success": success})


# GET /api/faqs
@app.route("/api/faqs", methods=["GET"])
def get_faqs():
    faqs = admin_db.get_all_faqs()
    return jsonify({"faqs": faqs})


# POST /api/admin/faqs
@app.route("/api/admin/faqs", methods=["POST"])
def create_faq_endpoint():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    question = data.get("question")
    answer = data.get("answer")

    if not question or not answer:
        return jsonify({"error": "Question and answer required"}), 400

    faq_id = admin_db.create_faq(question, answer)
    return jsonify({"success": True, "faq_id": faq_id}), 201


# DELETE /api/admin/faqs/<int:faq_id>
@app.route("/api/admin/faqs/<int:faq_id>", methods=["DELETE"])
def delete_faq_endpoint(faq_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    success = admin_db.delete_faq(faq_id)
    return jsonify({"success": success})


# GET /api/rewards
@app.route("/api/rewards", methods=["GET"])
def get_rewards():
    rewards = admin_db.get_all_rewards()
    return jsonify({"rewards": rewards})


# POST /api/admin/rewards
@app.route("/api/admin/rewards", methods=["POST"])
def create_reward_endpoint():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    name = data.get("name")
    description = data.get("description")
    cost = data.get("cost")
    image_url = data.get("image_url")

    if not all([name, description, cost, image_url]):
        return jsonify({"error": "All fields required"}), 400
    try:
        cost = float(cost)
    except (ValueError, TypeError):
        return jsonify({"error": "Cost must be a number"}), 400

    reward_id = admin_db.create_reward(name, description, cost, image_url)
    return jsonify({"success": True, "reward_id": reward_id}), 201


# DELETE /api/admin/rewards/<int:reward_id>
@app.route("/api/admin/rewards/<int:reward_id>", methods=["DELETE"])
def delete_reward_endpoint(reward_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_admin"]:
        return jsonify({"error": "Unauthorized"}), 403

    success = admin_db.delete_reward(reward_id)
    return jsonify({"success": success})


# GET /api/reviewer/projects
@app.route("/api/reviewer/projects", methods=["GET"])
def get_reviewer_projects():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_reviewer"]:
        return jsonify({"error": "Unauthorized"}), 403

    projects = db.get_all_projects()
    return jsonify({"projects": projects})


# POST /api/reviewer/projects/<int:project_id>/approve
@app.route("/api/reviewer/projects/<int:project_id>/approve", methods=["POST"])
def approve_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_reviewer"]:
        return jsonify({"error": "Unauthorized"}), 403

    project = db.get_project_by_id(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    project_user = db.get_user_by_id(project["user_id"])
    if project_user:
        project["slack_id"] = project_user["slack_id"]
        project["nickname"] = project_user["nickname"]

    success = db.update_project_status(project_id, "Shipped")
    if success:
        slack.project_shipped(project)

    return jsonify({"success": success})


# POST /api/reviewer/projects/<int:project_id>/reject
@app.route("/api/reviewer/projects/<int:project_id>/reject", methods=["POST"])
def reject_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not user["is_reviewer"]:
        return jsonify({"error": "Unauthorized"}), 403

    project = db.get_project_by_id(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    project_user = db.get_user_by_id(project["user_id"])
    if project_user:
        project["slack_id"] = project_user["slack_id"]
        project["nickname"] = project_user["nickname"]

    data = request.get_json()
    reason = data.get("reason", "") if data else ""

    success = db.update_project_status(project_id, "Building")
    if success:
        slack.project_rejected(project, reason)

    return jsonify({"success": success})


if __name__ == "__main__":
    app.run(debug=True)
