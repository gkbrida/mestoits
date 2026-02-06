import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface MediasStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function MediasStep({ data, onUpdate, onValidationChange }: MediasStepProps) {
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});

  // Valider le formulaire et notifier le parent
  useEffect(() => {
    const isValid = !!(data.images && data.images.length > 0);
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.images]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Vous devez être connecté pour uploader des images');
      return;
    }

    setUploadingPhotos(true);
    setUploadProgress({});
    
    try {
      const uploadedUrls: string[] = [];
      const filesArray = Array.from(files);
      
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const fileIndex = (data.images?.length || 0) + i;
        
        // Vérifier la taille (max 10 MB par image)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.size > maxSize) {
          alert(`L'image ${file.name} est trop volumineuse (max 10 MB)`);
          continue;
        }

        // Générer un nom de fichier unique
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `properties/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        // Upload vers Supabase Storage
        setUploadProgress(prev => ({ ...prev, [fileIndex]: 0 }));
        
        const { error: uploadError } = await supabase.storage
          .from('professional-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Erreur upload image:', uploadError);
          // En cas d'erreur, utiliser une URL temporaire base64 pour l'affichage
          const reader = new FileReader();
          reader.onloadend = () => {
            uploadedUrls.push(reader.result as string);
            if (uploadedUrls.length === filesArray.length) {
              onUpdate({ images: [...(data.images || []), ...uploadedUrls] });
              setUploadingPhotos(false);
              setUploadProgress({});
            }
          };
          reader.readAsDataURL(file);
          continue;
        }

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('professional-assets')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
        setUploadProgress(prev => ({ ...prev, [fileIndex]: 100 }));
      }

      // Mettre à jour les images avec les URLs uploadées
      onUpdate({ images: [...(data.images || []), ...uploadedUrls] });
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des photos:', error);
      alert(`Erreur lors de l'upload des photos: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setUploadingPhotos(false);
      setUploadProgress({});
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Vous devez être connecté pour uploader une vidéo');
      return;
    }

    // Vérifier la taille (max 30 MB)
    const maxSize = 30 * 1024 * 1024; // 30 MB en bytes
    if (file.size > maxSize) {
      setVideoError('La vidéo ne doit pas dépasser 30 MB');
      return;
    }

    setVideoError(null);
    setUploadingVideo(true);

    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `properties/${user.id}/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('professional-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Erreur upload vidéo:', uploadError);
        setVideoError(`Erreur lors de l'upload de la vidéo: ${uploadError.message}`);
        // En cas d'erreur, utiliser une URL temporaire base64 pour l'affichage
        const reader = new FileReader();
        reader.onloadend = () => {
          onUpdate({ video_url: reader.result as string });
          setUploadingVideo(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('professional-assets')
        .getPublicUrl(filePath);

      onUpdate({ video_url: publicUrl });
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de la vidéo:', error);
      setVideoError(`Erreur lors de l'upload de la vidéo: ${error.message || 'Erreur inconnue'}`);
      // En cas d'erreur, utiliser une URL temporaire base64 pour l'affichage
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ video_url: reader.result as string });
        setUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(data.images || [])];
    newImages.splice(index, 1);
    onUpdate({ images: newImages });
  };

  const removeVideo = () => {
    onUpdate({ video_url: undefined });
    setVideoError(null);
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
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Médias</h2>
        <p className="text-sm md:text-base text-gray-600">
          Ajoutez des photos et une vidéo pour valoriser votre bien
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
              {uploadingPhotos ? (
                <span className="flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Téléchargement en cours...
                </span>
              ) : (
                'Cliquez pour ajouter des photos'
              )}
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

      {/* Upload de vidéo */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          Vidéo du bien (optionnel)
        </label>
        
        {data.video_url ? (
          <div className="relative">
            <div className="aspect-video rounded-lg md:rounded-xl overflow-hidden bg-gray-100">
              <video
                src={data.video_url}
                controls
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-2 right-2 w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
            >
              <i className="ri-delete-bin-line text-white w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg md:rounded-xl p-6 sm:p-8 text-center hover:border-teal-600 transition-colors cursor-pointer">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              id="video-upload"
              disabled={uploadingVideo}
            />
            <label htmlFor="video-upload" className="cursor-pointer">
              <i className="ri-video-add-line text-4xl sm:text-5xl text-gray-400 mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto"></i>
              <div className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                {uploadingVideo ? (
                  <span className="flex items-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Téléchargement en cours...
                  </span>
                ) : (
                  'Cliquez pour ajouter une vidéo'
                )}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                ou glissez-déposez votre vidéo ici
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">
                MP4, MOV ou AVI (max. 30 MB)
              </div>
            </label>
          </div>
        )}

        {videoError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-800">{videoError}</p>
          </div>
        )}
      </div>

      {/* Visite virtuelle */}
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
