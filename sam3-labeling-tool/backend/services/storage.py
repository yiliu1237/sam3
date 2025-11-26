import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
from PIL import Image
import aiofiles


class StorageService:
    """Handle file storage and management"""

    def __init__(self, base_path: str = None):
        if base_path is None:
            # Default to data directory in project root
            base_path = os.path.join(os.path.dirname(__file__), '../../data')

        self.base_path = Path(base_path)
        self.uploads_path = self.base_path / 'uploads'
        self.outputs_path = self.base_path / 'outputs'
        self.temp_path = self.base_path / 'temp'

        # Create directories
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        self.outputs_path.mkdir(parents=True, exist_ok=True)
        self.temp_path.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file_content: bytes, filename: str) -> tuple[str, str]:
        """
        Save uploaded file

        Args:
            file_content: File content as bytes
            filename: Original filename

        Returns:
            Tuple of (file_id, file_path)
        """
        # Generate unique ID
        file_id = str(uuid.uuid4())
        extension = Path(filename).suffix

        # Save file
        file_path = self.uploads_path / f"{file_id}{extension}"

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        return file_id, str(file_path)

    def get_upload_path(self, file_id: str) -> Optional[str]:
        """Get path to uploaded file"""
        # Find file with matching ID
        for file_path in self.uploads_path.glob(f"{file_id}.*"):
            return str(file_path)
        return None

    def save_mask(self, mask_array, output_name: str) -> str:
        """
        Save mask as PNG

        Args:
            mask_array: Numpy array of mask
            output_name: Output filename

        Returns:
            Path to saved mask
        """
        output_path = self.outputs_path / output_name

        # Convert to PIL Image and save
        mask_image = Image.fromarray((mask_array * 255).astype('uint8'))
        mask_image.save(output_path)

        return str(output_path)

    def get_files_in_folder(self, folder_path: str, extensions: List[str] = None) -> List[str]:
        """
        Get all files in a folder

        Args:
            folder_path: Path to folder
            extensions: List of file extensions to filter (e.g., ['.jpg', '.png'])

        Returns:
            List of file paths
        """
        folder = Path(folder_path)
        if not folder.exists():
            raise ValueError(f"Folder {folder_path} does not exist")

        files = []
        for file_path in folder.iterdir():
            if file_path.is_file():
                if extensions is None or file_path.suffix.lower() in extensions:
                    files.append(str(file_path))

        return files

    def create_output_folder(self, folder_name: str) -> str:
        """Create output folder"""
        output_folder = self.outputs_path / folder_name
        output_folder.mkdir(parents=True, exist_ok=True)
        return str(output_folder)

    def cleanup_temp(self):
        """Clean up temporary files"""
        for file_path in self.temp_path.glob('*'):
            if file_path.is_file():
                file_path.unlink()

    def delete_file(self, file_id: str):
        """Delete uploaded file"""
        file_path = self.get_upload_path(file_id)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)


# Global instance
_storage_service = None


def get_storage_service() -> StorageService:
    """Get or create StorageService singleton"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
