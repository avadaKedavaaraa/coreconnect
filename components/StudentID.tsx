import React, { useState, useEffect } from 'react';
import { Lineage, type UserProfile } from '../types';
import { QrCode, Shield, Fingerprint, Edit2, Check, Upload, X } from 'lucide-react';

interface StudentIDProps {
  lineage: Lineage;
  profile: UserProfile;
}

const StudentID: React.FC<StudentIDProps> = ({ lineage, profile }) => {
  const [flipped, setFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isWizard = lineage === Lineage.WIZARD;

  // Local State for Customization
  const [customData, setCustomData] = useState({
    name: 'John Doe',
    house: profile.house,
    idNumber: isWizard ? '934-MAGIC' : 'SYS-ADMIN-01',
    image: isWizard 
      ? "https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=200&h=200&fit=crop" 
      : "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=200&h=200&fit=crop"
  });

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('core_connect_student_id');
    if (saved) {
      try {
        setCustomData(JSON.parse(saved));
      } catch(e) {}
    } else {
        // Reset defaults based on current lineage if no save
        setCustomData(prev => ({
             ...prev,
             idNumber: isWizard ? '934-MAGIC' : 'SYS-ADMIN-01',
             image: isWizard 
                ? "https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=200&h=200&fit=crop" 
                : "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=200&h=200&fit=crop"
        }));
    }
  }, [lineage]);

  const handleSave = () => {
    localStorage.setItem('core_connect_student_id', JSON.stringify(customData));
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex justify-center py-6 perspective-container">
      <div 
        className={`relative w-80 h-48 transition-transform duration-700 preserve-3d cursor-pointer ${flipped && !isEditing ? 'rotate-y-180' : ''}`}
        onClick={() => !isEditing && setFlipped(!flipped)}
        style={{ transform: flipped && !isEditing ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden rounded-xl border-2 overflow-hidden shadow-xl
          ${isWizard 
            ? 'bg-[#1a1510] border-emerald-600 shadow-emerald-900/50 bg-[url("https://www.transparenttextures.com/patterns/aged-paper.png")]' 
            : 'bg-black border-fuchsia-500 shadow-fuchsia-900/50'}
        `}>
           {/* Edit Button */}
           <button 
             onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setFlipped(false); }}
             className={`absolute top-2 right-2 z-20 p-1.5 rounded-full transition-colors
               ${isWizard 
                 ? 'text-emerald-600 hover:bg-emerald-900/20' 
                 : 'text-fuchsia-600 hover:bg-fuchsia-900/20'}
             `}
           >
             {isEditing ? <X size={16} /> : <Edit2 size={16} />}
           </button>

           <div className="absolute top-0 right-0 p-4 opacity-50 z-0">
              {isWizard ? <Shield size={40} className="text-emerald-700" /> : <Fingerprint size={40} className="text-fuchsia-700" />}
           </div>
           
           <div className="p-6 flex gap-4 items-center h-full relative z-10">
              {/* Photo Area */}
              <div className={`w-24 h-24 shrink-0 rounded border-2 flex items-center justify-center bg-black/20 overflow-hidden relative group
                ${isWizard ? 'border-emerald-500/50' : 'border-fuchsia-500/50'}
              `}>
                 <img 
                   src={customData.image} 
                   alt="Student" 
                   className="w-full h-full object-cover opacity-80"
                 />
                 {isEditing && (
                   <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={20} className="text-white mb-1" />
                      <span className="text-[8px] text-white uppercase">Change</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                   </label>
                 )}
              </div>

              {/* Details Area */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input 
                      value={customData.name}
                      onChange={(e) => setCustomData({...customData, name: e.target.value})}
                      className={`w-full bg-transparent border-b outline-none text-sm font-bold ${isWizard ? 'border-emerald-700 text-emerald-100 placeholder:text-emerald-800' : 'border-fuchsia-700 text-fuchsia-100 placeholder:text-fuchsia-800'}`}
                      placeholder="Name"
                    />
                    <input 
                      value={customData.house}
                      onChange={(e) => setCustomData({...customData, house: e.target.value as any})}
                      className={`w-full bg-transparent border-b outline-none text-xs ${isWizard ? 'border-emerald-700 text-emerald-300' : 'border-fuchsia-700 text-fuchsia-300'}`}
                      placeholder="House/Dept"
                    />
                     <input 
                      value={customData.idNumber}
                      onChange={(e) => setCustomData({...customData, idNumber: e.target.value})}
                      className={`w-full bg-transparent border-b outline-none text-[10px] ${isWizard ? 'border-emerald-700 text-emerald-500' : 'border-fuchsia-700 text-fuchsia-500'}`}
                      placeholder="ID Number"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSave(); }}
                      className={`mt-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold
                         ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}
                      `}
                    >
                       <Check size={10} /> SAVE
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className={`text-xl font-bold leading-none mb-1 ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                      {customData.name}
                    </h3>
                    <p className={`text-sm ${isWizard ? 'font-wizard text-emerald-400' : 'font-muggle text-fuchsia-400'}`}>
                      {customData.house}
                    </p>
                    <p className={`text-xs mt-2 opacity-60 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                      ID: {customData.idNumber}
                    </p>
                    <div className={`mt-2 text-xs px-2 py-0.5 rounded inline-block border
                       ${isWizard ? 'border-emerald-800 text-emerald-600' : 'border-fuchsia-800 text-fuchsia-600'}
                    `}>
                       AUTHORIZED
                    </div>
                  </>
                )}
              </div>
           </div>
        </div>

        {/* Back */}
        <div className={`absolute inset-0 backface-hidden rounded-xl border-2 overflow-hidden shadow-xl rotate-y-180 flex items-center justify-center flex-col gap-4
          ${isWizard 
            ? 'bg-[#1a1510] border-emerald-600' 
            : 'bg-black border-fuchsia-500'}
        `}>
           <QrCode size={80} className={isWizard ? 'text-emerald-200 opacity-80' : 'text-fuchsia-200 opacity-80'} />
           <p className={`text-xs tracking-widest ${isWizard ? 'font-wizard text-emerald-400' : 'font-muggle text-fuchsia-400'}`}>
             {isWizard ? 'LIBRARY ACCESS PASS' : 'SECURITY CLEARANCE: L4'}
           </p>
        </div>

      </div>
       <style dangerouslySetInnerHTML={{
        __html: `
          .rotate-y-180 { transform: rotateY(180deg); }
          .backface-hidden { backface-visibility: hidden; }
        `
      }} />
    </div>
  );
};

export default StudentID;