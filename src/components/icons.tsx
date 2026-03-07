import Image from 'next/image';

export const Logo = () => (
  <div className="flex items-center gap-3">
    <Image src="/icon.svg" alt="energy engine logo" width={36} height={36} />
    <div className="flex flex-col leading-tight">
      <span className="font-headline text-xl font-bold tracking-tighter">energy engine</span>
      <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">grupos electrogenos</span>
    </div>
  </div>
);
