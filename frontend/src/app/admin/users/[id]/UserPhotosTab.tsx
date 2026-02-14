import { Camera } from 'lucide-react';

interface UserPhotosTabProps {
    photos: string[];
}

export default function UserPhotosTab({ photos }: UserPhotosTabProps) {
    if (photos.length === 0) {
        return <p className="no-data">No photos uploaded</p>;
    }

    return (
        <div className="photos-grid">
            {photos.map((photo, index) => (
                <div key={photo} className="photo-item">
                    <Camera size={32} />
                    <span>Photo {index + 1}</span>
                </div>
            ))}
        </div>
    );
}
