"""Convert historical public Cloudinary uploads to authenticated assets.

Run from backend using the root Python environment. Default is a dry run;
--apply changes Cloudinary assets and commits their delivery metadata.
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.app import app
from app.extensions import db
from app.announcements.model import UploadedFile


def legacy_metadata(record):
    parts = unquote(urlparse(record.storage_path).path).split("/")
    position = parts.index("upload")
    resource_type = parts[position - 1]
    asset_parts = parts[position + 1:]
    if asset_parts and asset_parts[0].startswith("v") and asset_parts[0][1:].isdigit():
        asset_parts = asset_parts[1:]
    path = "/".join(asset_parts)
    extension = path.rsplit(".", 1)[-1]
    return {"public_id": path if resource_type == "raw" else path.rsplit(".", 1)[0], "resource_type": resource_type, "format": extension}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    import cloudinary
    import cloudinary.uploader
    with app.app_context():
        cloudinary.config(cloud_name=app.config["CLOUDINARY_CLOUD_NAME"], api_key=app.config["CLOUDINARY_API_KEY"], api_secret=app.config["CLOUDINARY_API_SECRET"], secure=True)
        rows = db.session.scalars(db.select(UploadedFile).where(UploadedFile.storage_backend == "cloudinary")).all()
        for row in rows:
            try:
                json.loads(row.storage_path)
                continue
            except (ValueError, TypeError):
                metadata = legacy_metadata(row)
            print(f"{'Migrate' if args.apply else 'Would migrate'} {row.filename}")
            if args.apply:
                cloudinary.uploader.rename(metadata["public_id"], metadata["public_id"], resource_type=metadata["resource_type"], type="upload", to_type="authenticated", overwrite=False, invalidate=True)
                row.storage_path = json.dumps(metadata)
                row.url = row.delivery_url
                db.session.commit()


if __name__ == "__main__":
    main()
