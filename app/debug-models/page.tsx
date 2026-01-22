
import { listModelsAction } from "@/lib/debug-ai";

export default async function DebugModelsPage() {
    const models = await listModelsAction();

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Debug AI Models</h1>
            <pre className="bg-gray-100 p-4 rounded border">
                {JSON.stringify(models, null, 2)}
            </pre>
        </div>
    );
}
