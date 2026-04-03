import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
            {/* Background Image with Fade */}
            <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6976e00a8554ca99c049c9f3/56e013c36_404.png)'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/40"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 max-w-2xl w-full px-6">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-4">
                        <h1 className="text-9xl font-serif font-bold text-amber-100 drop-shadow-2xl">404</h1>
                        <p className="text-xl font-serif text-amber-200/90 italic">
                            not even the Berean's could find that reference
                        </p>
                    </div>
                    
                    {/* Page Name */}
                    <div className="pt-4">
                        <p className="text-amber-300/80 leading-relaxed">
                            The page <span className="font-medium text-amber-200">"{pageName}"</span> could not be found
                        </p>
                    </div>
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-6 py-3 text-sm font-medium text-amber-100 bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 rounded-lg shadow-lg transition-all duration-200"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Return Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}