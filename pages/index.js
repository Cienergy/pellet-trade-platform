import { useRouter } from "next/router";
import Image from "next/image";
import { CheckCircleIcon, PackageIcon, FactoryIcon, TrendingUpIcon } from "../components/Icons";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
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

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              Cienergy Pellet Trading Platform
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Procure certified solid biofuels for industrial process heating.
              Built on traceable supply chains, predictable delivery, and
              measurable climate impact.
            </p>

            {/* Login Button */}
            <div className="pt-8">
              <button
                onClick={() => router.push("/login")}
                className="px-10 py-4 bg-[#0b69a3] text-white text-lg font-semibold rounded-lg hover:bg-[#095b88] transition-colors shadow-lg hover:shadow-xl"
              >
                Login to Platform
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center space-y-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Certified Biofuels</h3>
            <p className="text-gray-600 text-sm">Lab-verified specifications</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#0b69a3] bg-opacity-10 text-[#0b69a3] flex items-center justify-center mx-auto mb-4">
              <PackageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">CAPS™ Traceability</h3>
            <p className="text-gray-600 text-sm">Full supply chain transparency</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FactoryIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Industrial Scale</h3>
            <p className="text-gray-600 text-sm">Reliable bulk supply</p>
          </div>
          
          <div className="text-center space-y-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Climate Impact</h3>
            <p className="text-gray-600 text-sm">Verified carbon reduction</p>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Measured Impact</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
              <div className="text-5xl font-bold text-[#0b69a3] mb-2">&gt; 1.5M</div>
              <div className="text-gray-600">tCO₂e emissions reduced</div>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
              <div className="text-5xl font-bold text-[#0b69a3] mb-2">&gt; 0.7M</div>
              <div className="text-gray-600">person-days of employment</div>
            </div>
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
              <div className="text-5xl font-bold text-[#0b69a3] mb-2">&gt; 30K</div>
              <div className="text-gray-600">tons topsoil preserved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-500 text-sm border-t border-gray-200">
        <p>© {new Date().getFullYear()} Cienergy. All rights reserved.</p>
      </div>
    </div>
  );
}
