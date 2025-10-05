from flask import Flask, render_template, request, jsonify
import yt_dlp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

# 1. Serve the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

# 2. API route to SEARCH for a song and get the direct audio URL
@app.route('/get_audio_url', methods=['POST'])
def get_audio_url():
    try:
        data = request.get_json()
        search_query = data.get('query')
        if not search_query:
            return jsonify({'status': 'error', 'message': 'No search query provided'}), 400

        logging.info(f"Received search query: {search_query}")

        # Configure yt-dlp to search and pick the first result
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'noplaylist': True,
            'default_search': 'ytsearch1',  # Important: tells it to search and get the first result
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # We don't provide a URL, just the search query. yt-dlp handles the rest.
            info = ydl.extract_info(search_query, download=False)
            
            # The info dict might contain a list of entries if a search is done
            if 'entries' in info and len(info['entries']) > 0:
                # Get the first video from the search results
                first_video = info['entries'][0]
                audio_url = first_video.get('url')
                title = first_video.get('title', 'Audio')

                if audio_url:
                    logging.info(f"Successfully found audio URL for '{title}'")
                    return jsonify({'status': 'success', 'audio_url': audio_url, 'title': title})
                else:
                    raise ValueError("Could not find a playable URL in the video metadata.")
            else:
                 raise ValueError("YouTube search returned no results.")

    except Exception as e:
        logging.error(f"Error extracting audio for query '{search_query}': {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)