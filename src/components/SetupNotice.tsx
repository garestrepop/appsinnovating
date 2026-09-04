export function SetupNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">Falta configuración</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2">
        Revisa el archivo <code className="rounded bg-amber-100 px-1">README.md</code>{" "}
        para ver cómo crear la base de Airtable y definir las variables de entorno.
      </p>
    </div>
  );
}
