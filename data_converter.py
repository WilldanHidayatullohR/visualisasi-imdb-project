import pandas as pd
import json

# Nama file CSV yang diunggah
CSV_FILE_NAME = 'IMDb movies.csv'
# Nama file JSON output
JSON_FILE_NAME = 'imdb_movies_processed.json'

try:
    # --- 1. Memuat Data ---
    df = pd.read_csv(CSV_FILE_NAME)

    # --- 2. Pemilihan dan Pembersihan Kolom ---
    df_clean = df[[
        'title', 'year', 'genre', 'duration', 'director', 'description', 'avg_vote'
    ]].copy()

    # Hapus baris yang memiliki nilai NaN (hilang) pada kolom kritis
    df_clean.dropna(subset=['genre', 'director', 'description', 'avg_vote', 'duration'], inplace=True)

    # --- 3. Normalisasi Kolom Genre ---
    # Ambil hanya genre pertama untuk mempermudah visualisasi di Chart.js
    df_clean['main_genre'] = df_clean['genre'].apply(lambda x: x.split(',')[0].strip())

    # --- 4. Penamaan Ulang dan Finalisasi ---
    df_clean.columns = [
        'title', 'year', 'genre_full', 'duration', 'director', 'description', 'rating', 'genre'
    ]

    # Pilih kolom final untuk diekspor ke JSON
    df_export = df_clean[['title', 'year', 'genre', 'duration', 'director', 'description', 'rating']]

    # --- 5. Konversi ke JSON ---
    # 'orient='records'' menghasilkan List of Objects (JSON Array) yang ideal untuk JavaScript
    # 'indent=2' membuat file JSON mudah dibaca
    df_export.to_json(JSON_FILE_NAME, orient='records', indent=2)

    print(f"✅ Konversi berhasil! File '{JSON_FILE_NAME}' telah dibuat dengan {len(df_export)} baris data.")

except FileNotFoundError:
    print(f"❌ Error: File '{CSV_FILE_NAME}' tidak ditemukan. Pastikan nama file sudah benar.")
except Exception as e:
    print(f"❌ Error saat memproses data: {e}")