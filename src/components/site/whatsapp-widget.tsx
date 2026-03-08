'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { User, Phone } from 'lucide-react';

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white"
    >
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.426 2.527 1.181 3.575l-.818 2.996 3.063-.805c.981.693 2.139 1.107 3.342 1.107h.001c3.181 0 5.767-2.586 5.768-5.767-.001-3.18-2.587-5.766-5.768-5.766zm0 10.3c-1.077 0-2.131-.295-3.031-.831l-.216-.129-2.253.592.603-2.203-.141-.223c-.604-1.002-.923-2.169-.922-3.378.002-2.514 2.043-4.555 4.557-4.555 2.514 0 4.555 2.041 4.556 4.555-.001 2.514-2.042 4.556-4.556 4.556zm5.289-3.303c-.282-.142-1.662-.82-1.92-.914-.257-.094-.445-.142-.632.142-.188.282-.725.914-.889 1.102s-.328.213-.609.071c-2.062-1.015-3.41-2.909-3.568-3.088s-.024-.282.117-.395c.129-.104.282-.282.424-.424.142-.141.188-.235.282-.395.094-.159.047-.294-.024-.412-.071-.118-.632-1.52-.868-2.083-.225-.548-.465-.473-.633-.48-.159-.008-.346-.01-.534-.01s-.47.071-.716.353c-.247.282-.94.914-.94 2.227s.963 2.584 1.099 2.772c.138.188 1.882 2.959 4.646 4.103.66.275 1.18.438 1.59.558.581.173 1.112.149 1.522.09.469-.068 1.412-.577 1.61-1.136.198-.559.198-1.037.137-1.136-.06-.1-.225-.159-.496-.282z" />
    </svg>
);


const Delegations = [
    {
        name: 'Andrés Granados',
        title: 'Delegación Norte',
        phone: '34683775208',
    },
    {
        name: 'Antonio Ugena',
        title: 'Delegación Sur',
        phone: '34635120510',
    }
];

export default function WhatsAppWidget() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:bg-[#128C7E] hover:scale-110 z-50"
          aria-label="Contactar por WhatsApp"
        >
          <WhatsAppIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mr-4 mb-2">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Contactar Delegación</h4>
            <p className="text-sm text-muted-foreground">
              Seleccione para iniciar una conversación.
            </p>
          </div>
          <div className="grid gap-2">
            {Delegations.map((delegation) => {
                 const whatsappUrl = `https://wa.me/${delegation.phone}?text=Hola%20${encodeURIComponent(delegation.name)}`;
                 return (
                    <a
                        key={delegation.name}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                    >
                        <div>
                            <p className="font-semibold">{delegation.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3"/>
                                <span>{delegation.name}</span>
                            </div>
                        </div>
                        <Phone className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                    </a>
                 )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
