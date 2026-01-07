import os
import requests
from typing import Optional, Dict, Any

SLACK_BOT_TOKEN = os.getenv('SLACK_BOT_TOKEN')

def send_dm(user_slack_id: str, blocks: list) -> bool:
    if not SLACK_BOT_TOKEN:
        print("Error: SLACK_BOT_TOKEN not set")
        return False
    
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "channel": user_slack_id,
        "blocks": blocks
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        if not data.get("ok"):
            print(f"Slack API error: {data.get('error')}")
            return False
        
        return True
    except Exception as e:
        print(f"Failed to send Slack DM: {e}")
        return False


def send_channel_message(channel: str, blocks: list) -> bool:
    
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "channel": channel,
        "blocks": blocks
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        if not data.get("ok"):
            print(f"Slack API error: {data.get('error')}")
            return False
        
        return True
    except Exception as e:
        print(f"Failed to send Slack channel message: {e}")
        return False


def project_shipped(project):
    blocks = [
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "🚢 *Your project has been approved and therefore shipped!*"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{project['title']}* by _user_"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": f"{project['description']}",
                "emoji": True
            }
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"<{project['demo_link']}|Demo> | 3h 32m | <{project['github_link']}|GitHub>"
                }
            ]
        }
    ]

    send_dm(project['slack_id'], blocks)

    blocks = [
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "🚢 *A project has shipped!*"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{project['title']}*"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": f"{project['description']}",
                "emoji": True
            }
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"<{project['demo_link']}|Demo> | 3h 32m | <{project['github_link']}|GitHub>"
                }
            ]
        }
    ]

    send_channel_message("C09FZ9G125V", blocks)



