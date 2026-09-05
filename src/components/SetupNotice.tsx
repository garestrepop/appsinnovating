export function SetupNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="font-medium text-amber-100">Falta configuración</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2">
        Revisa el archivo <code className="rounded bg-amber-500/20 px-1">README.md</code>{" "}
        para ver cómo crear la base de Airtable y definir las variables de entorno.
      </p>
    </div>
  );
}
