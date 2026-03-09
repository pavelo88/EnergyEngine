export default function Footer() {
  return (
    <footer className="py-12 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
        © {new Date().getFullYear()} energy engine • Engineering Mastery
      </p>
    </footer>
  );
}
