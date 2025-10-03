import { Scissors, Instagram, Facebook, Twitter } from '@/lib/icons';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleSocialClick = (platform: string) => {
    const urls = {
      instagram: 'https://instagram.com/deinisbarberclub',
      facebook: 'https://facebook.com/deinisbarberclub',
      twitter: 'https://twitter.com/deinisbarberclub',
    } as const;
    window.open(urls[platform as keyof typeof urls], '_blank');
  };

  return (
    <footer className="border-t border-gray-900 bg-[#050505]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 flex items-center gap-2 sm:order-1">
            <Scissors className="text-brand" size={24} />
            <span className="text-sm font-semibold text-white">
              <span className="text-brand">Deinis</span> Barber Club · C. de Juslibol, 46 · 50015 Zaragoza
            </span>
          </div>

          <div className="order-1 text-[11px] text-gray-500 sm:order-2">
            © {currentYear} Deinis Barber Club.
          </div>

          <div className="order-3 flex items-center gap-2">
            <button
              onClick={() => handleSocialClick('instagram')}
              className="rounded-md bg-[#111] p-2 text-gray-400 transition hover:bg-brand hover:text-black"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </button>
            <button
              onClick={() => handleSocialClick('facebook')}
              className="rounded-md bg-[#111] p-2 text-gray-400 transition hover:bg-brand hover:text-black"
              aria-label="Facebook"
            >
              <Facebook size={16} />
            </button>
            <button
              onClick={() => handleSocialClick('twitter')}
              className="rounded-md bg-[#111] p-2 text-gray-400 transition hover:bg-brand hover:text-black"
              aria-label="Twitter"
            >
              <Twitter size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => window.open('https://wa.me/34653481270?text=Hola,%20me%20gustaría%20reservar%20una%20cita%20en%20Deinis%20Barber%20Club', '_blank')}
          className="rounded-full bg-[#25D366] p-4 text-white shadow-lg transition hover:scale-110 hover:bg-[#20BA5A]"
          aria-label="Contactar por WhatsApp"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.085"/>
          </svg>
        </button>
      </div>
    </footer>
  );
}
