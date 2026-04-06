import json
import subprocess
import os
import re
from datetime import datetime

# Configuration
CHANNEL_URL = "https://www.youtube.com/@engineeringautomation"
DATA_FILE = "data.js"

def get_channel_data():
    print(f"Fetching data for {CHANNEL_URL}...")
    
    # Get channel metadata
    cmd_meta = [
        "yt-dlp", 
        "--no-check-certificates", 
        "--flat-playlist", 
        "--print", "%(uploader)s|%(channel_follower_count)s|%(channel_view_count)s", 
        "--playlist-end", "1", 
        CHANNEL_URL
    ]
    
    try:
        meta_out = subprocess.check_output(cmd_meta).decode('utf-8').strip().split('\n')[0].split('|')
        uploader = meta_out[0]
        subs = int(meta_out[1]) if meta_out[1].isdigit() else 24900
        # channel_view_count often returns NA via flat-playlist, we might need to sum video views
    except Exception as e:
        print(f"Error fetching meta: {e}")
        uploader = "Engineering & Automation"
        subs = 24900

    # Get all videos
    cmd_vids = [
        "yt-dlp", 
        "--no-check-certificates", 
        "--flat-playlist", 
        "--dump-json", 
        f"{CHANNEL_URL}/videos"
    ]
    
    videos = []
    total_views = 0
    
    try:
        vids_out = subprocess.check_output(cmd_vids).decode('utf-8').splitlines()
        for line in vids_out:
            v = json.loads(line)
            view_count = v.get('view_count', 0) or 0
            total_views += view_count
            
            # Determine tags based on title
            title = v.get('title', '').lower()
            tags = []
            tag_labels = []
            
            if 'bms' in title or 'bas' in title:
                tags.append('bms')
                tag_labels.append({"cls": "tag-bms", "text": "BMS"})
            if 'ahu' in title or 'hvac' in title or 'vav' in title or 'fcu' in title:
                tags.append('ahu')
                tag_labels.append({"cls": "tag-ahu", "text": "AHU" if 'ahu' in title else "HVAC"})
            if 'bacnet' in title:
                tags.append('bacnet')
                tag_labels.append({"cls": "tag-bacnet", "text": "BACnet"})
            if 'control' in title or 'pid' in title or 'loop' in title:
                tags.append('controls')
                tag_labels.append({"cls": "tag-controls", "text": "Controls"})
                
            if not tags: # Default
                tags.append('controls')
                tag_labels.append({"cls": "tag-controls", "text": "Engineering"})

            videos.append({
                "id": v.get('id'),
                "title": v.get('title'),
                "views": view_count,
                "viewsLabel": format_views(view_count),
                "duration": v.get('duration_string', '0:00'),
                "durationSecs": v.get('duration', 0),
                "age": v.get('upload_date', ''), # We'll keep it raw or format later
                "tags": tags,
                "tagLabels": tag_labels,
                "description": v.get('description', '')[:200] + "..." if v.get('description') else ""
            })
    except Exception as e:
        print(f"Error fetching videos: {e}")

    # Get shorts
    cmd_shorts = [
        "yt-dlp", 
        "--no-check-certificates", 
        "--flat-playlist", 
        "--dump-json", 
        f"{CHANNEL_URL}/shorts"
    ]
    try:
        shorts_out = subprocess.check_output(cmd_shorts).decode('utf-8').splitlines()
        for line in shorts_out:
            v = json.loads(line)
            view_count = v.get('view_count', 0) or 0
            total_views += view_count
            videos.append({
                "id": v.get('id'),
                "title": v.get('title'),
                "views": view_count,
                "viewsLabel": format_views(view_count),
                "duration": "< 1 min",
                "durationSecs": v.get('duration', 0),
                "age": v.get('upload_date', ''),
                "tags": ["controls"],
                "tagLabels": [{"cls": "tag-controls", "text": "Controls"}, {"cls": "tag-short", "text": "Short"}],
                "description": v.get('description', '')[:200] + "..." if v.get('description') else "",
                "isShort": True
            })
    except Exception as e:
        print(f"Error fetching shorts: {e}")

    # Re-calculate total views if meta was NA
    # (Actually channel views is usually > video views sum due to deleted/unlisted, so we'll use sum as fallback)
    
    return {
        "lastUpdated": datetime.now().isoformat(),
        "subscribers": subs,
        "totalViews": total_views,
        "videoCount": len(videos),
        "videos": videos
    }

def format_views(n):
    if n >= 1000000: return f"{n/1000000:.1f}M".replace(".0", "")
    if n >= 1000: return f"{n/1000:.0f}K"
    return str(n)

def update_file(data):
    json_data = json.dumps(data, indent=2)
    content = f"/* \n  ENGINEERING & AUTOMATION - CHANNEL DATA\n  This file is automatically updated by the sync script.\n*/\nconst CHANNEL_DATA = {json_data};"
    
    with open(DATA_FILE, "w") as f:
        f.write(content)
    print(f"Successfully updated {DATA_FILE}")

if __name__ == "__main__":
    data = get_channel_data()
    update_file(data)
