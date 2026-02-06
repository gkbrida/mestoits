import { useState, useEffect } from 'react';

interface PhotosStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function PhotosStep({ data, onUpdate, onValidationChange }: PhotosStepProps) {
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Valider le formulaire et notifier le parent
  useEffect(() => {
    const isValid = !!(data.images && data.images.length > 0);
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.images]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadingPhotos(true);
    
    // Simuler l'upload et générer des URLs temporaires
    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          onUpdate({ images: [...(data.images || []), ...newImages] });
          setUploadingPhotos(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...(data.images || [])];
    newImages.splice(index, 1);
    onUpdate({ images: newImages });
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...(data.images || [])];
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onUpdate({ images: newImages });
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Photos et médias</h2>
        <p className="text-sm md:text-base text-gray-600">
          Ajoutez des photos de qualité pour attirer plus d'acheteurs
        </p>
      </div>

      {/* Upload de photos */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          Photos du bien <span className="text-red-500">*</span>
        </label>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg md:rounded-xl p-6 sm:p-8 text-center hover:border-teal-600 transition-colors cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload"
            disabled={uploadingPhotos}
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <i className="ri-image-add-line text-4xl sm:text-5xl text-gray-400 mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto"></i>
            <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
              {uploadingPhotos ? 'Téléchargement en cours...' : 'Cliquez pour ajouter des photos'}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              ou glissez-déposez vos images ici
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">
              JPG, PNG ou WEBP (max. 10 Mo par image)
            </div>
          </label>
        </div>

        {/* Galerie de photos */}
        {(data.images || []).length > 0 && (
          <div className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
              <div className="text-xs sm:text-sm font-semibold text-gray-900">
                {(data.images || []).length} photo{(data.images || []).length > 1 ? 's' : ''} ajoutée{(data.images || []).length > 1 ? 's' : ''}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                La première photo sera la photo principale
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {(data.images || []).map((image: string, index: number) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg md:rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={image}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {index === 0 && (
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-teal-600 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded md:rounded-lg">
                      Photo principale
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg md:rounded-xl flex items-center justify-center gap-1 sm:gap-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'left')}
                        className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <i className="ri-arrow-left-line text-gray-900 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <i className="ri-delete-bin-line text-white w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </button>
                    {index < (data.images || []).length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'right')}
                        className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <i className="ri-arrow-right-line text-gray-900 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan et visite virtuelle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
            Lien du plan (optionnel)
          </label>
          <input
            type="url"
            value={data.floor_plan_url || ''}
            onChange={(e) => onUpdate({ floor_plan_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
          />
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1 md:mt-2">
            Lien vers une image ou un PDF du plan
          </div>
        </div>
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
            Lien de la visite 3D (optionnel)
          </label>
          <input
            type="url"
            value={data.virtual_tour_url || ''}
            onChange={(e) => onUpdate({ virtual_tour_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
          />
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1 md:mt-2">
            Lien Matterport, 360° ou autre visite virtuelle
          </div>
        </div>
      </div>

      {(data.images || []).length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl p-4 sm:p-6 text-center">
          <i className="ri-camera-line text-2xl sm:text-3xl text-amber-600 mb-2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mx-auto"></i>
          <p className="text-xs sm:text-sm text-amber-800 font-semibold">
            Ajoutez au moins 3 photos pour maximiser vos chances de vente
          </p>
        </div>
      )}
    </div>
  );
}
