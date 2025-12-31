import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/api';
import { markArticleAsRead } from '../utils/articleStorage';

// Google Drive linkini rasm URL'iga o'tkazish
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;
  
  if (url.includes('drive.google.com/uc?export=view')) {
    return url;
  }
  
  let fileId = '';
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) {
    fileId = match1[1];
  }
  
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) {
    fileId = match2[1];
  }
  
  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  return url;
};

interface Material {
  id: number;
  title: string;
  content?: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO' | 'IMAGE';
  fileUrl?: string;
  durationMin?: number;
  orderIndex: number;
}

interface Step {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  materials: Material[];
}

interface Stage {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  steps: Step[];
}

interface Training {
  id: number;
  title: string;
  description?: string;
}

export default function TrainingStageDetail() {
  const { trainingId, stageId } = useParams<{ trainingId: string; stageId: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trainingId && stageId) {
      fetchData();
      
      // Mark article as read when user opens the article detail page
      // This uses the centralized localStorage utility for consistency
      const trainingIdNum = parseInt(trainingId);
      const stageIdNum = parseInt(stageId);
      
      if (!isNaN(trainingIdNum) && !isNaN(stageIdNum)) {
        markArticleAsRead(trainingIdNum, stageIdNum);
      }
    }
  }, [trainingId, stageId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Training ma'lumotlarini olish
      const trainingResponse = await apiClient.get(`/training/${trainingId}`);
      setTraining(trainingResponse.data);
      
      // Stage ma'lumotlarini topish
      const stage = trainingResponse.data.stages?.find((s: Stage) => s.id === parseInt(stageId));
      if (stage) {
        setStage(stage);
      } else {
        alert('Bosqich topilmadi');
        navigate(`/training/${trainingId}/manage`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ma\'lumotlarni yuklashda xatolik');
      navigate(`/training/${trainingId}/manage`);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialComplete = async (materialId: number) => {
    try {
      await apiClient.post(`/training/${trainingId}/materials/${materialId}/complete`);
      alert('Material muvaffaqiyatli yakunlandi!');
      fetchData();
    } catch (error: any) {
      console.error('Error completing material:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.error);
      } else {
        alert('Xatolik yuz berdi');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!stage || !training) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Maqola topilmadi</p>
          <button
            onClick={() => navigate(`/training/${trainingId}/manage`)}
            className="text-blue-600 mt-4 inline-block"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  // Barcha materiallarni to'plash
  const allMaterials: Material[] = [];
  stage.steps.forEach(step => {
    allMaterials.push(...step.materials);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/training/${trainingId}/manage`)}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Orqaga
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{stage.title}</h1>
          {training.title && (
            <p className="text-sm text-gray-500 mb-4">Kurs: {training.title}</p>
          )}
          {stage.description && (
            <div 
              className="text-gray-700 leading-relaxed prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: stage.description }}
            />
          )}
        </div>
      </div>

      {/* Maqola kontenti */}
      <div className="bg-white rounded-lg shadow p-8">
        <article className="prose prose-lg max-w-none">
          {/* Stage description HTML kontenti */}
          {stage.description && (
            <div 
              className="prose prose-lg max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: stage.description }}
            />
          )}
          
          {/* Steps va Materiallar */}
          {stage.steps && stage.steps.length > 0 ? (
            <div className="space-y-8">
              {stage.steps
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((step, stepIndex) => (
                  <div key={step.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                    {step.title && (
                      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        {step.title}
                      </h2>
                    )}
                    {step.description && (
                      <div className="text-gray-700 whitespace-pre-wrap mb-6 leading-relaxed">
                        {step.description}
                      </div>
                    )}
                    
                    {/* Step materiallari */}
                    {step.materials.length > 0 && (
                      <div className="space-y-6 mt-6">
                        {step.materials
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((material) => (
                            <div key={material.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">
                                  {material.type === 'TEXT' && '📄'}
                                  {material.type === 'AUDIO' && '🎵'}
                                  {material.type === 'VIDEO' && '🎥'}
                                  {material.type === 'IMAGE' && '🖼️'}
                                </span>
                                {material.title}
                              </h3>
                              
                              {/* Material kontenti */}
                              <div className="space-y-4">
                                {material.type === 'TEXT' && material.content && (
                                  <div 
                                    className="lesson-content text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-gray-200"
                                    dangerouslySetInnerHTML={{ __html: material.content }}
                                    style={{
                                      fontFamily: 'system-ui, -apple-system, sans-serif',
                                    }}
                                  />
                                )}

                                {material.type === 'VIDEO' && material.fileUrl && (
                                  <div className="rounded-lg overflow-hidden">
                                    <video
                                      src={material.fileUrl}
                                      controls
                                      className="w-full rounded-lg"
                                    >
                                      Video'ni qo'llab-quvvatlamaydi
                                    </video>
                                  </div>
                                )}

                                {material.type === 'AUDIO' && material.fileUrl && (
                                  <div className="bg-white p-4 rounded border">
                                    <audio
                                      src={material.fileUrl}
                                      controls
                                      className="w-full"
                                    >
                                      Audio'ni qo'llab-quvvatlamaydi
                                    </audio>
                                  </div>
                                )}

                                {material.type === 'IMAGE' && material.fileUrl && (
                                  <div className="rounded-lg overflow-hidden">
                                    <img
                                      src={convertGoogleDriveUrl(material.fileUrl)}
                                      alt={material.title}
                                      className="w-full rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== material.fileUrl) {
                                          target.src = material.fileUrl || '';
                                        }
                                      }}
                                    />
                                  </div>
                                )}

                                {material.durationMin && (
                                  <p className="text-sm text-gray-500">
                                    Davomiyligi: {material.durationMin} daqiqa
                                  </p>
                                )}

                                <button
                                  onClick={() => handleMaterialComplete(material.id)}
                                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  ✓ Materialni yakunlash
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Materiallar mavjud emas
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

