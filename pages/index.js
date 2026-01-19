import { useRouter } from "next/router";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/cienergy-logo.png"
                alt="Cienergy Logo"
                width={200}
                height={80}
                className="object-contain"
              />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-green-300 bg-clip-text text-transparent">
              Customer Portal
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Procure certified solid biofuels for industrial process heating.
              Built on traceable supply chains, predictable delivery, and
              measurable climate impact.
            </p>

            {/* Login Button */}
            <div className="pt-8">
              <button
                onClick={() => router.push("/login")}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-lg font-semibold rounded-full hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
              >
                Login to Platform
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center space-y-4 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-4">✔</div>
            <h3 className="text-xl font-semibold">Certified Biofuels</h3>
            <p className="text-gray-400">Lab-verified specifications</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold">CAPS™ Traceability</h3>
            <p className="text-gray-400">Full supply chain transparency</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold">Industrial Scale</h3>
            <p className="text-gray-400">Reliable bulk supply</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold">Climate Impact</h3>
            <p className="text-gray-400">Verified carbon reduction</p>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Measured Impact</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-green-400 mb-2">&gt; 1.5M</div>
              <div className="text-gray-300">tCO₂e emissions reduced</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-2">&gt; 0.7M</div>
              <div className="text-gray-300">person-days of employment</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-green-400 mb-2">&gt; 30K</div>
              <div className="text-gray-300">tons topsoil preserved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-400">
        <p>© 2024 Cienergy. All rights reserved.</p>
      </div>
    </div>
  );
}
