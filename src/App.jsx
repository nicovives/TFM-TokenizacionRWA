// Importación de dependencias principales para el manejo de la interfaz y el ciclo de vida
import { useState, useEffect, useCallback } from 'react';
// Importación de la librería de Web3 para la interacción con la blockchain de Ethereum
import { ethers } from 'ethers';
// Importación del ABI (Application Binary Interface) del contrato principal del mercado
import MercadoABI from './MercadoInmobiliario.json';
// Importación de la hoja de estilos global
import './App.css';

// Dirección pública en la blockchain donde está desplegado el Smart Contract principal
const direccionContrato = "0x3A679093fDf1d9F1dDCca168021297AD42d1CBa8";

// Definición de las interfaces legibles (Human-Readable ABIs) para interactuar con los contratos
// Interfaz estándar ERC-20 para la gestión de balances y aprobaciones de gasto
const abiERC20 = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function totalSupply() public view returns (uint256)"
];

// Interfaz extendida para la lectura de metadatos específicos de cada inmueble tokenizado
const abiInmueble = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function direccionInmueble() public view returns (string)",
  "function ipfsDocumentoUrl() public view returns (string)",
  "function ipfsImagenUrl() public view returns (string)"
];

// Función de utilidad para parsear y traducir excepciones de la máquina virtual de Ethereum (EVM) 
// y del proveedor Web3 (MetaMask) a mensajes comprensibles para la interfaz de usuario (UI).
const traducirErrorWeb3 = (error) => {
  // Extracción de la carga útil del error priorizando el mensaje directo o la razón de la reversión.
  const mensajeCrudo = error?.message || error?.reason || JSON.stringify(error);

  // Interceptación de rechazo de firma por parte del usuario en el proveedor.
  if (error.code === 'ACTION_REJECTED' || mensajeCrudo.includes("user rejected")) {
    return "⚠️ Operación cancelada en MetaMask.";
  }
  // Interceptación de errores por falta de liquidez (gas/fondo subyacente).
  if (mensajeCrudo.includes("insufficient funds") || mensajeCrudo.includes("saldo insuficiente")) {
    return "❌ Fondos insuficientes de ETH.";
  }
  // Interceptación de excepciones personalizadas emitidas por el Smart Contract.
  if (error.reason) {
    return `❌ Error: ${error.reason}`;
  }
  // Interceptación de errores de balance del estándar ERC-20.
  if (mensajeCrudo.includes("transfer amount exceeds balance") || mensajeCrudo.includes("0xe450d38c")) {
    return "❌ No tienes suficientes tokens.";
  }

  // Captura de errores atípicos para depuración en consola y mensaje genérico de seguridad en UI.
  console.error("Error no clasificado:", error);
  return "❌ Ocurrió un error inesperado.";
};

// Sistema de diseño: Definición centralizada de la paleta de colores y variables temáticas.
const paletas = {
  minimal: { primary: '#1d1d1f', bg: '#ffffff', text: '#1d1d1f' },
};

// Componente funcional de React (UI Atom) para entradas de formulario. 
// Encapsula estilos globales, consistencia visual y transiciones de estado de foco.
const MinimalInput = (props) => {
  // Definición del objeto de estilos en línea (CSS-in-JS).
  const estiloInput = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    borderRadius: '12px',
    border: '1px solid #d2d2d7',
    backgroundColor: '#ffffff',
    color: '#1d1d1f',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  };

  // Renderizado del elemento del DOM inyectando propiedades heredadas y manejadores de eventos.
  return (
    <input
      {...props}
      style={{ ...estiloInput, ...props.style }}
      onFocus={(e) => e.target.style.borderColor = paletas.minimal.primary}
      onBlur={(e) => e.target.style.borderColor = '#d2d2d7'}
    />
  );
};

// Componente principal de la aplicación: Gestiona el estado global, el ciclo de vida y el renderizado UI
function App() {
  // Inicialización del tema visual basado en la paleta predefinida
  const tema = paletas.minimal;

  // --- ESTADO GLOBAL (STATE MANAGEMENT) ---
  // Hook useState: Variables reactivas que re-renderizan el componente al actualizarse.

  // Estado de sesión y control de acceso (RBAC)
  const [cuenta, setCuenta] = useState(null); // Almacena la dirección pública (wallet) del usuario conectado
  const [esAdmin, setEsAdmin] = useState(false); // Flag booleano para mostrar/ocultar el Panel de Gestión

  // Estado de feedback de la Interfaz de Usuario (UI)
  const [error, setError] = useState(''); // Almacena mensajes de error traducidos para el usuario
  const [estadoTx, setEstadoTx] = useState(''); // Almacena mensajes de carga durante transacciones asíncronas

  // Estado del Oráculo de precios (Conversión fiat-to-crypto)
  const [tasaCambio, setTasaCambio] = useState(null); // Precio actual de ETH/EUR obtenido de la API externa

  // --- ESTADO DE FORMULARIOS (TWO-WAY DATA BINDING) ---
  // Formulario: Nueva Tokenización (Creación de Activo)
  const [nombre, setNombre] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [direccionFisica, setDireccionFisica] = useState('');
  const [ipfsUrl, setIpfsUrl] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [precioEur, setPrecioEur] = useState('');
  const [tokens, setTokens] = useState('');
  const [precioEthVisual, setPrecioEthVisual] = useState('0'); // Valor calculado dinámicamente

  // Formulario: Revalorización (Actualización del Oráculo interno)
  const [modDireccion, setModDireccion] = useState('');
  const [modPrecioEur, setModPrecioEur] = useState('');

  // Formulario: Mercado Secundario (Compra/Venta)
  const [invDireccion, setInvDireccion] = useState('');
  const [invCantidad, setInvCantidad] = useState('');

  // --- ESTADO DE LA BASE DE DATOS BLOCKCHAIN ---
  const [escaparate, setEscaparate] = useState([]); // Array de objetos con los datos de todas las propiedades
  const [cargandoEscaparate, setCargandoEscaparate] = useState(false); // Flag visual para la sincronización inicial
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // --- SISTEMA DE DISEÑO EN LÍNEA (CSS-in-JS) ---
  // Objeto 'S' (Styles) que encapsula las reglas CSS para mantener la cohesión visual del componente
  const S = {
    body: {
      backgroundColor: tema.bg,
      color: tema.text,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
      padding: '2rem 1rem',
      transition: 'all 0.3s ease' // Transición suave para posibles cambios de tema
    },
    wrapper: { maxWidth: '1100px', margin: '0 auto' },
    header: { textAlign: 'center', marginBottom: '3rem' },
    title: { fontSize: '40px', color: '#1d1d1f', fontWeight: 600, letterSpacing: '-1px', margin: 0 },
    subtitle: { fontSize: '19px', color: '#1d1d1f', fontWeight: 400, marginTop: '10px' },

    // Tarjetas modulares utilizando Glassmorphism
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '2rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
      marginBottom: '2rem',
      border: '1px solid rgba(0,0,0,0.01)'
    },
    sectionTitle: { fontSize: '24px', color: '#1d1d1f', fontWeight: 600, marginBottom: '1.5rem', marginTop: 0 },

    // Componentes de interacción con bordes pill-shaped
    btnPrimary: {
      backgroundColor: tema.primary,
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '980px',
      border: 'none',
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
      display: 'inline-block'
    },

    btnSecondary: {
      backgroundColor: 'transparent',
      color: tema.primary,
      padding: '12px 24px',
      borderRadius: '980px',
      border: `1px solid ${tema.primary}`,
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },

    // Layout responsivo
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' },

    // Indicadores de estado flotantes
    badge: {
      padding: '8px 16px',
      borderRadius: '980px',
      fontSize: '14px',
      fontWeight: 500,
      textAlign: 'center',
      marginBottom: '2rem'
    }
  };

  // Sincronización con oráculo off-chain: Obtención de la cotización actual del par ETH/EUR
  // Se ejecuta de forma asíncrona una única vez durante el montaje del componente.
  useEffect(() => {
    const obtenerPrecio = async () => {
      try {
        const respuesta = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur');
        const datos = await respuesta.json();
        setTasaCambio(datos.ethereum.eur);
      } catch (e) {
        console.error("Error API:", e);
      }
    };
    obtenerPrecio();
  }, []);

  // Efecto reactivo para la conversión bidireccional fiat-to-crypto en la Interfaz de Usuario.
  // Se dispara automáticamente cuando el usuario modifica el valor fiduciario o se actualiza la tasa.
  useEffect(() => {
    if (precioEur && tasaCambio) {
      setPrecioEthVisual((parseFloat(precioEur) / tasaCambio).toFixed(6));
    } else {
      setPrecioEthVisual('0');
    }
  }, [precioEur, tasaCambio]);

  // Sistema de Control de Acceso Basado en Roles (RBAC) descentralizado.
  // Consulta el estado inmutable del Smart Contract para verificar los privilegios de la wallet conectada.
  // Se utiliza useCallback para memorizar la referencia de la función y optimizar el ciclo de renderizado.
  const verificarRol = useCallback(async (addressUsuario) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contrato = new ethers.Contract(direccionContrato, MercadoABI, provider);

      // Lectura de la variable pública 'administrador' alojada en la blockchain
      const adminBlockchain = await contrato.administrador();

      // Normalización de direcciones (lowercase) para evitar fallos de validación por checksums
      if (adminBlockchain.toLowerCase() === addressUsuario.toLowerCase()) {
        console.log("👮 Rol verificado: Es Administrador");
        setEsAdmin(true);
      } else {
        console.log("👤 Rol verificado: Es Inversor");
        setEsAdmin(false);
      }
    } catch (e) {
      console.error("Error verificando rol:", e);
      setEsAdmin(false);
    }
  }, []);

  // Sincronización del estado on-chain con el frontend: Hidratación del catálogo de inmuebles.
  // Utiliza useCallback para mantener la estabilidad de la referencia de la función en el árbol de dependencias.
  const cargarEscaparate = useCallback(async () => {
    // Guard clause: Verifica la inyección del proveedor Web3 (MetaMask) en el objeto global (DOM).
    if (!window.ethereum) return;

    // Activación del indicador visual de carga de red.
    setCargandoEscaparate(true);

    try {
      // Instanciación del proveedor de lectura (Read-Only Provider) y del Smart Contract principal.
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contratoMercado = new ethers.Contract(direccionContrato, MercadoABI, provider);

      let index = 0;
      let listaCasas = [];
      let sigueBuscando = true;

      // Patrón de iteración de array dinámico on-chain: 
      // Dado que Solidity no expone nativamente la longitud de arrays públicos, 
      // iteramos por índice hasta provocar una excepción (out-of-bounds).
      while (sigueBuscando) {
        try {
          // 1. Lectura del registro principal: Obtiene la dirección del contrato derivado (ERC-20).
          const direccionInmueble = await contratoMercado.listaInmuebles(index);
          // 2. Lectura del mapping de detalles comerciales (precio y stock disponible).
          const detalles = await contratoMercado.inmuebles(direccionInmueble);
          // 3. Instanciación del contrato ERC-20 específico del inmueble para extraer sus metadatos.
          const contratoCasa = new ethers.Contract(direccionInmueble, abiInmueble, provider);

          // Ejecución asíncrona concurrente (Promise.all) para optimizar los tiempos de respuesta (RPC calls).
          const [n, s, d, docUrl, imgUrl] = await Promise.all([
            contratoCasa.name(),
            contratoCasa.symbol(),
            contratoCasa.direccionInmueble(),
            contratoCasa.ipfsDocumentoUrl(),
            contratoCasa.ipfsImagenUrl()
          ]);

          // Mapeo y formateo de los datos crudos de la EVM al modelo de datos del frontend.
          listaCasas.push({
            direccion: direccionInmueble,
            nombre: n,
            simbolo: s,
            direccionFisica: d,
            ipfsDocumentoUrl: docUrl,
            ipfsImagenUrl: imgUrl,
            precioUnitarioWei: detalles.precioPorToken,
            // Normalización de enteros de precisión arbitraria (BigInt) eliminando los 18 decimales nativos.
            tokensDisponibles: detalles.tokensDisponibles / 10n ** 18n
          });
          index++;
        } catch (err) {
          // Imprime el error real en la consola para saber qué está rompiendo el bucle
          console.error("El bucle se ha roto en el índice", index, "por este motivo:", err);
          sigueBuscando = false;
        }
      }

      // Actualización atómica del estado de la UI con la matriz de datos completa.
      setEscaparate(listaCasas);
    } catch (error) {
      console.error("Error escaparate:", error);
    }

    // Desactivación del indicador visual de carga independientemente del resultado de la promesa.
    setCargandoEscaparate(false);
  }, []);

  // Efecto reactivo (Lifecycle hook) para la hidratación del catálogo.
  // Escucha cambios en el estado de autenticación de la wallet del usuario.
  // Solo dispara la lectura de la blockchain cuando existe una cuenta conectada válida.
  useEffect(() => {
    if (cuenta) {
      cargarEscaparate();
    }
  }, [cuenta, cargarEscaparate]);

  // Gestor de autenticación y conexión con el proveedor Web3 inyectado (MetaMask).
  const conectarWallet = async () => {
    // Reinicio del estado de error previo a un nuevo intento de conexión.
    setError('');

    try {
      // Verificación de la disponibilidad de la API de Ethereum en el navegador.
      if (window.ethereum) {
        // Petición de acceso a las cuentas del usuario (Desencadena el pop-up de MetaMask).
        const cuentas = await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Enrutamiento forzado a la red de pruebas Sepolia (Chain ID: 0xaa36a7).
        // Previene transacciones erróneas si el usuario está conectado a la Mainnet u otra red.
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }]
          });
        } catch (e) {
          // Captura silenciosa si la red ya está configurada o si el usuario rechaza el cambio.
        }

        // Actualización del estado global con la dirección pública principal del usuario.
        setCuenta(cuentas[0]);

        // Disparo automático de la auditoría de Control de Acceso (RBAC) para esta nueva cuenta.
        verificarRol(cuentas[0]);
      } else {
        // Excepción controlada si el entorno carece de un cliente Web3.
        setError('Instala MetaMask.');
      }
    } catch (err) {
      // Captura de rechazo de conexión por parte del usuario o fallos del proveedor.
      setError('Error al conectar.');
    }
  };

  // --- CAPA DE ABSTRACCIÓN DE TRANSACCIONES ---

  // Función de Orden Superior (Higher-Order Function) para estandarizar el flujo de escritura en la blockchain.
  // Encapsula la gestión de estado (UI), la firma criptográfica, la espera de confirmación y el manejo de errores.
  const ejecutarTx = async (e, callbackAction, mensajeCarga, mensajeExito) => {
    // Intercepción del evento del formulario para evitar la recarga del navegador (Single Page Application).
    if (e && e.preventDefault) e.preventDefault();

    // Inicialización del estado visual de la transacción.
    setEstadoTx(mensajeCarga);
    setError('');

    try {
      // Inyección del proveedor y obtención del "Signer" (entidad criptográfica que firma la transacción).
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Ejecución dinámica de la función anónima (callback) inyectando el signer.
      await callbackAction(signer);

      // Notificación de éxito y limpieza programada del mensaje.
      setEstadoTx(mensajeExito);
      setTimeout(() => setEstadoTx(''), 4000);

      // Re-hidratación automática del estado global para reflejar los cambios en la interfaz.
      cargarEscaparate();
    } catch (error) {
      // Delegación del error al parseador semántico y actualización de la UI.
      setError(traducirErrorWeb3(error));
      setEstadoTx('');
    }
  };

  // --- MÉTODOS DE INTERACCIÓN CON EL SMART CONTRACT ---

  // Invocación del método de acuñación (minting) en el contrato del mercado.
  const tokenizar = (e) => ejecutarTx(e, async (signer) => {
    const contrato = new ethers.Contract(direccionContrato, MercadoABI, signer);

    // Conversión off-chain de la representación visual (ETH) a la unidad atómica de la EVM (Wei).
    const pTotalWei = ethers.parseEther(precioEthVisual.toString());
    // Cálculo del coste unitario por token para su inmutabilidad en el contrato.
    const pTokenWei = pTotalWei / BigInt(tokens);

    // Envío de la transacción de escritura.
    const tx = await contrato.crearInmueble(nombre, simbolo, tokens, direccionFisica, ipfsUrl, imagenUrl, pTokenWei);
    await tx.wait(); // Pausa la ejecución hasta que el bloque sea minado y confirmado.

    // Limpieza de los estados del formulario tras el éxito de la operación.
    setNombre(''); setSimbolo(''); setDireccionFisica(''); setIpfsUrl(''); setImagenUrl(''); setPrecioEur(''); setTokens('');
  }, '⏳ Creando activo en el registro...', '✅ ¡Inmueble tokenizado con éxito!');

  // Actualización del oráculo de precios interno del contrato para reflejar variaciones del mercado fiduciario.
  const actualizarPrecio = (e) => ejecutarTx(e, async (signer) => {
    const contrato = new ethers.Contract(direccionContrato, MercadoABI, signer);
    const tContrato = new ethers.Contract(modDireccion, abiERC20, signer);

    // Consulta dinámica del Supply Total del activo para recalcular el valor fraccionario.
    const sup = await tContrato.totalSupply();
    const nPTotalWei = ethers.parseEther(((parseFloat(modPrecioEur) / tasaCambio).toFixed(8)).toString());
    const nPUnitWei = nPTotalWei / (sup / 10n ** 18n);

    const tx = await contrato.modificarPrecio(modDireccion, nPUnitWei);
    await tx.wait();

    setModDireccion(''); setModPrecioEur('');
  }, '⏳ Actualizando oráculo de precio...', '✅ Precio actualizado.');

  // Ejecución de orden de compra con inyección de valor nativo (msg.value).
  const comprar = (e) => ejecutarTx(e, async (signer) => {
    const contrato = new ethers.Contract(direccionContrato, MercadoABI, signer);
    const det = await contrato.inmuebles(invDireccion);

    // Transferencia de fondos adjunta a la llamada del contrato (payable function).
    const tx = await contrato.comprarTokens(invDireccion, invCantidad, { value: det.precioPorToken * BigInt(invCantidad) });
    await tx.wait();
  }, '⏳ Ejecutando orden de compra...', '✅ Compra completada.');

  // Flujo de liquidación en mercado secundario mediante el patrón estándar ERC-20 (Approve + TransferFrom).
  const vender = (e) => ejecutarTx(e, async (signer) => {
    const cDecimales = ethers.parseEther(invCantidad.toString());
    const tContrato = new ethers.Contract(invDireccion, abiERC20, signer);

    // Fase 1: Autorización explícita del propietario para que el contrato mueva sus tokens.
    setEstadoTx('⏳ Paso 1/2: Aprobando tokens...');
    const txA = await tContrato.approve(direccionContrato, cDecimales);
    await txA.wait();

    // Fase 2: Ejecución de la liquidación y retiro de liquidez en moneda nativa (ETH).
    setEstadoTx('⏳ Paso 2/2: Recibiendo ETH...');
    const mContrato = new ethers.Contract(direccionContrato, MercadoABI, signer);
    const txV = await mContrato.venderTokens(invDireccion, invCantidad);
    await txV.wait();
  }, '', '✅ Venta completada.');

  // Helper puro para la conversión dinámica inversa (Wei -> ETH -> EUR) destinada a la capa de presentación.
  const calcEur = (wei) => tasaCambio ? (parseFloat(ethers.formatEther(wei)) * tasaCambio).toFixed(2) : "...";

  // --- CAPA DE PRESENTACIÓN (RENDERIZADO DECLARATIVO UI) ---
  return (
    <div style={S.body}>
      <div style={S.wrapper}>

        {/* CABECERA (Header Estático) */}
        <header style={S.header}>
          <h1 style={S.title}>Mercado de Inmuebles Tokenizados</h1>
          <p style={S.subtitle}>Opera con fracciones de Inmuebles Registrados en la Blockchain</p>
        </header>

        {/* RENDERIZADO CONDICIONAL: Control de Flujo de Autenticación */}
        {/* Si el estado 'cuenta' es nulo, se renderiza exclusivamente el prompt de conexión */}
        {!cuenta ? (
          <div style={{ textAlign: 'center', marginTop: '5rem' }}>
            <button onClick={conectarWallet} style={S.btnPrimary}>
              Conectar MetaMask
            </button>
            {/* Feedback de error en caso de fallo de inyección del proveedor Web3 */}
            {error && <p style={{ color: tema.primary, marginTop: '1rem' }}>{error}</p>}
          </div>
        ) : (
          /* Flujo autenticado: Renderizado del panel de control de la DApp */
          <div>

            {/* BARRA DE ESTADO (Contexto de Sesión) */}
            <div style={{ ...S.badge, backgroundColor: '#f5f5f7', color: tema.primary }}>
              Comunidad: {esAdmin ? ' Administrador' : ' Inversor'} | Wallet: {cuenta.substring(0, 6)}...{cuenta.substring(38)}
            </div>

            {/* Notificaciones flotantes (Toasts) ligadas al estado de la transacción */}
            {estadoTx && <div style={{ ...S.badge, backgroundColor: '#e1f5fe', color: '#0277bd' }}>{estadoTx}</div>}
            {error && <div style={{ ...S.badge, backgroundColor: '#ffebee', color: '#c62828' }}>{error}</div>}

            {/* ESCAPARATE DE PROPIEDADES (Renderizado de Listas Dinámicas) */}
            <section style={S.card}>
              <h2 style={S.sectionTitle}>Propiedades Disponibles</h2>

              {/* Renderizado condicional triple: Cargando -> Vacío -> Poblado */}
              {cargandoEscaparate ? (
                <p style={{ textAlign: 'center', color: '#86868b' }}>Sincronizando con la blockchain...</p>
              ) : escaparate.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #d2d2d7', borderRadius: '15px' }}>
                  <p style={{ color: '#86868b', margin: 0 }}>No hay inmuebles listados.</p>
                </div>
              ) : (
                <>
                <div style={S.grid}>
                  {/* Mapeo del array 'escaparate' para generar componentes de tarjeta inmutables */}
                  {(mostrarTodos ? escaparate : escaparate.slice(0, 3)).map((casa, i) => (
                    <div key={i} style={{ backgroundColor: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f5f5f7', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <div style={{ padding: '1.5rem' }}>
                        <img 
                          src={casa.ipfsImagenUrl} 
                          alt={`Foto de ${casa.nombre}`} 
                          style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px', cursor: 'pointer', transition: 'opacity 0.2s'}}
                          onClick={() => setImagenSeleccionada(casa.ipfsImagenUrl)}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'} 
                        />

                        <h3 style={{ margin: '0 0 8px 0', fontSize: '19px', fontWeight: 600 }}>{casa.nombre}</h3>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#86868b' }}>{casa.direccionFisica}</p>

                        <a 
                          href={casa.ipfsDocumentoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginBottom: '15px', color: '#0066cc', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}
                        >
                          📄 Ver Título de Propiedad
                        </a>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f5f7', padding: '10px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '17px', fontWeight: 600 }}>{calcEur(casa.precioUnitarioWei)} €</span>
                          <span style={{ fontSize: '14px', color: '#28a745', fontWeight: 500 }}>{casa.tokensDisponibles.toString()} / {casa.simbolo}</span>
                        </div>
                        {/* Botón de anclaje: Autocompleta el formulario de inversión inferior */}
                        <button
                          onClick={() => { setInvDireccion(casa.direccion); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
                          style={{ ...S.btnSecondary, width: '100%', marginTop: '1rem', padding: '10px', fontSize: '14px' }}
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {escaparate.length > 3 && (
                  <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                    <button 
                      onClick={() => setMostrarTodos(!mostrarTodos)} 
                      style={{ ...S.btnSecondary, backgroundColor: '#f5f5f7', border: 'none', color: '#1d1d1f' }}
                    >
                      {mostrarTodos ? 'Ocultar listado' : `Mostrar más inmuebles (${escaparate.length - 3} disponibles)`}
                    </button>
                  </div>
                )}
                </>
              )}
            </section>

            <div style={S.grid}>

              {/* ZONA DE ADMINISTRADOR (Control de Acceso Renderizado) */}
              {/* Solo se inyecta en el DOM si el flag esAdmin es verdadero */}
              {esAdmin && (
                <div style={{ ...S.card, border: `2px solid ${tema.primary}20` }}>
                  <h2 style={{ ...S.sectionTitle, color: tema.primary }}> Panel de Gestión</h2>

                  <form onSubmit={tokenizar} style={{ display: 'grid', gap: '12px', marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>Nueva Tokenización</h4>
                    {/* Componentes de entrada controlados (Controlled Components) por el estado de React */}
                    <MinimalInput type="text" placeholder="Nombre (Piso Gran Vía)" value={nombre} onChange={e => setNombre(e.target.value)} required />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <MinimalInput type="text" placeholder="Símbolo (GV-1)" value={simbolo} onChange={e => setSimbolo(e.target.value.toUpperCase())} required />
                      <MinimalInput type="number" placeholder="Tokens" value={tokens} onChange={e => setTokens(e.target.value)} required />
                    </div>
                    <MinimalInput type="text" placeholder="Dirección (Avenida...)" value={direccionFisica} onChange={e => setDireccionFisica(e.target.value)} required />
                    <MinimalInput 
                      type="text" 
                      placeholder="URL de Escritura (IPFS)" 
                      value={ipfsUrl} 
                      onChange={e => setIpfsUrl(e.target.value)} 
                      required 
                    />

                    <MinimalInput 
                      type="text" 
                      placeholder="URL de Imagen (IPFS)" 
                      value={imagenUrl} 
                      onChange={e => setImagenUrl(e.target.value)} 
                      required 
                      style={{ marginTop: '2px' }} 
                    />
                    <div style={{ position: 'relative' }}>
                      <MinimalInput type="number" placeholder="Valor Total (€)" value={precioEur} onChange={e => setPrecioEur(e.target.value)} required style={{ paddingRight: '100px' }} />
                      <span style={{ position: 'absolute', right: '15px', top: '15px', color: '#86868b', fontSize: '14px' }}>≈ {precioEthVisual} ETH</span>
                    </div>
                    <button type="submit" style={S.btnPrimary}>Crear Activo</button>
                  </form>

                  <form onSubmit={actualizarPrecio} style={{ display: 'grid', gap: '12px', borderTop: '1px solid #d2d2d7', paddingTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>Revalorización</h4>
                    <MinimalInput type="text" placeholder="Dirección Inmueble (0x...)" value={modDireccion} onChange={e => setModDireccion(e.target.value)} required />
                    <MinimalInput type="number" placeholder="Nuevo Valor Total (€)" value={modPrecioEur} onChange={e => setModPrecioEur(e.target.value)} required />
                    <button type="submit" style={{ ...S.btnPrimary, backgroundColor: '#1d1d1f', color: '#ffffff' }}>Actualizar Precio</button>
                  </form>
                </div>
              )}

              {/* ZONA DE INVERSORES (Punto de acceso público al mercado secundario) */}
              <div style={{ ...S.card, alignSelf: 'flex-start' }}>
                <h2 style={{ ...S.sectionTitle, color: tema.primary }}> Panel de Inversión</h2>
                <p style={{ fontSize: '15px', color: '#86868b', marginTop: '-1rem', marginBottom: '1.5rem' }}>Adquiere o vende fracciones de propiedad en tiempo real.</p>

                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: '12px' }}>
                  <MinimalInput type="text" placeholder="Contrato de la propiedad (0x...)" value={invDireccion} onChange={e => setInvDireccion(e.target.value)} required />
                  <MinimalInput type="number" placeholder="Cantidad de Participaciones" value={invCantidad} onChange={e => setInvCantidad(e.target.value)} required />

                  <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                    <button type="button" onClick={comprar} style={{ ...S.btnPrimary, flex: 1, backgroundColor: tema.primary }}>Comprar</button>
                    <button type="button" onClick={vender} style={{ ...S.btnSecondary, flex: 1, border: `1px solid ${tema.primary}`, color: tema.primary }}>Vender</button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        )}
        {imagenSeleccionada && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.85)', // Fondo oscuro semitransparente
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999, // Asegura que esté por encima de todo
              cursor: 'zoom-out' // Cursor de lupa con el signo menos
            }}
            onClick={() => setImagenSeleccionada(null)} // Si haces clic en cualquier lado, se cierra
          >
            <img 
              src={imagenSeleccionada} 
              alt="Vista ampliada" 
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: '12px',
                boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }} 
            />
            
            <span style={{ position: 'absolute', top: '30px', right: '40px', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
              ✕
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Exportación del módulo para su inyección en el DOM principal de la aplicación
export default App;