import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import AdminChangePassword from "../components/AdminChangePassword"
import { loginPersistent } from "../utils/persistentAuth"
import { Context } from "../js/store/appContext.jsx"

export default function LoginAdmin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [activeTab, setActiveTab] = useState("login") // 'login' o 'changePassword'
    const navigate = useNavigate()
    const { actions } = useContext(Context) || { actions: {} }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const result = await loginPersistent(email, password)

        if (result.success && result.isAdmin) {
            // Actualiza el usuario admin en el store global
            if (actions && typeof actions.hydrateSession === "function") {
                await actions.hydrateSession();
            }
            navigate("/admin/products")
        } else {
            setError(result.error || "Credenciales inválidas o sin permisos de admin")
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white rounded-lg shadow-md w-96">
                {/* Tabs */}
                {/*  <div className="flex border-b">
                    <button
                        onClick={() => {
                            setActiveTab("login")
                            setError("")
                        }}
                        className={`flex-1 py-1 px-4 text-center font-medium transition-colors text-sm ${activeTab === "login"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("changePassword")
                            setError("")
                        }}
                        className={`flex-1 py-1 px-4 text-center font-medium transition-colors text-sm ${activeTab === "changePassword"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        Cambiar Contraseña
                    </button>
                </div> */}

                {/* Contenido */}
                <div className="p-6">
                    {activeTab === "login" ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <h1 className="text-lg font-semibold text-center mb-6">
                                Login Admin
                            </h1>

                            {error && (
                                <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full border rounded px-3 py-2 pr-10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Contraseña"
                                    className="w-full border rounded px-3 py-2 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                    {showPassword ? "🙈" : "👁"}
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 text-white rounded px-3 py-2 hover:bg-purple-700 disabled:opacity-50"
                            >
                                {loading ? "Ingresando..." : "Ingresar"}
                            </button>
                        </form>
                    ) : activeTab === "changePassword" ? (
                        <div>
                            <h1 className="text-lg font-semibold text-center mb-6">
                                Cambiar Contraseña
                            </h1>
                            <AdminChangePassword />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}