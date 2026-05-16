import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChronotopStore } from '../store/useChronotopStore.js';

export function useModuleData() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const loadModuleData = useChronotopStore(s => s.loadModuleData);
  const currentModuleId = useChronotopStore(s => s.currentModuleId);

  useEffect(() => {
    if (moduleId && moduleId !== currentModuleId) {
      loadModuleData(moduleId);
    }
  }, [moduleId, currentModuleId, loadModuleData]);

  return moduleId;
}
