// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importamos el contrato de la vivienda para poder crear tokens desde aquí
import "./ContratoInmueble.sol";
// Importamos la interfaz estándar ERC20 para poder interactuar con los tokens
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MercadoInmobiliario {
    
    // El administrador será mi wallet (para que solo yo pueda subir PDFs/crear casas)
    address public administrador;

    // Creamos un Struct para guardar los datos comerciales de cada casa
    struct DetallesInmueble {
        address direccionContrato;
        uint256 precioPorToken;     // En Wei (la medida más pequeña de ETH)
        uint256 tokensDisponibles;  // Cuántos quedan en la tienda
    }

    // Un diccionario (mapping) que asocia el DNI del contrato con su ficha comercial
    mapping(address => DetallesInmueble) public inmuebles;
    
    // Una lista (array) con las direcciones de todas las casas para mostrarlas en la web
    address[] public listaInmuebles;

    // Eventos (Señales que el contrato envía a la web para actualizar la pantalla)
    event InmuebleCreado(address tokenAddress, string nombre, uint256 precio);
    event TokensComprados(address comprador, address token, uint256 cantidad);
    event TokensVendidos(address vendedor, address token, uint256 cantidad);
    event PrecioModificado(address tokenInmueble, uint256 precioAntiguo, uint256 precioNuevo);

    constructor() {
        administrador = msg.sender; // El que despliega el Mercado se convierte en el administrador
    }

    /// @dev FUNCIÓN 1: El Administrador crea una nueva vivienda
    function crearInmueble(
        string memory _nombre,
        string memory _simbolo,
        uint256 _cantidadTotal,
        string memory _direccionFisica,
        string memory _ipfsUrl,
        string memory _ipfsImagenUrl,
        uint256 _precioPorToken
    ) public {
        require(msg.sender == administrador, "Solo el administrador puede tokenizar casas");

        // Despliegue del clon del contrato ContratoInmueble (El Patrón Factory)
        ContratoInmueble nuevoInmueble = new ContratoInmueble(
            _nombre, _simbolo, _cantidadTotal, _direccionFisica, _ipfsUrl, _ipfsImagenUrl, address(this)
        );

        // Obtención de su DNI (address) único
        address direccionToken = address(nuevoInmueble);

        // Registro en la base de datos de nuestra tienda
        inmuebles[direccionToken] = DetallesInmueble({
            direccionContrato: direccionToken,
            precioPorToken: _precioPorToken,
            tokensDisponibles: _cantidadTotal * 10 ** 18 // Ajuste por los 18 decimales de blockchain
        });

        // Añadir a la lista
        listaInmuebles.push(direccionToken);

        // Aviso a la web
        emit InmuebleCreado(direccionToken, _nombre, _precioPorToken);
    }

    /// @dev FUNCIÓN 2: Un inversor compra tokens pagando con criptomonedas nativas (ETH/MATIC)
    
    function comprarTokens(address _tokenInmueble, uint256 _cantidadTokens) public payable {
        DetallesInmueble storage inmueble = inmuebles[_tokenInmueble];
        require(inmueble.direccionContrato != address(0), "El inmueble no existe");
        
        uint256 cantidadTokensDec = _cantidadTokens * 10 ** 18;
        require(inmueble.tokensDisponibles >= cantidadTokensDec, "No quedan suficientes tokens");

        // Calculamos cuánto tiene que pagar en total
        uint256 costeTotal = inmueble.precioPorToken * _cantidadTokens;
        require(msg.value >= costeTotal, "No has enviado suficiente ETH para la compra");

        // Actualizamos el inventario de la tienda
        inmueble.tokensDisponibles -= cantidadTokensDec;
        
        // Enviamos los tokens del Mercado a la wallet del comprador
        IERC20(_tokenInmueble).transfer(msg.sender, cantidadTokensDec);

        emit TokensComprados(msg.sender, _tokenInmueble, _cantidadTokens);
    }

    /// @dev FUNCIÓN 3: Un propietario vende tokens y recibe criptomonedas.
    function venderTokens(address _tokenInmueble, uint256 _cantidadTokens) public {
        DetallesInmueble storage inmueble = inmuebles[_tokenInmueble];
        require(inmueble.direccionContrato != address(0), "El inmueble no existe");

        uint256 cantidadTokensDec = _cantidadTokens * 10 ** 18;

        // El Mercado coge los tokens de la wallet del usuario y los devuelve a la tienda
        // (Para ello el usuario debe haber dado permiso 'approve' antes en la web)
        IERC20(_tokenInmueble).transferFrom(msg.sender, address(this), cantidadTokensDec);

        // Sumamos los tokens al inventario
        inmueble.tokensDisponibles += cantidadTokensDec;

        // Le devolvemos su ETH al usuario
        uint256 pagoTotal = inmueble.precioPorToken * _cantidadTokens;
        (bool exito, ) = payable(msg.sender).call{value: pagoTotal}("");
        require(exito, "Fallo al devolver el ETH");

        emit TokensVendidos(msg.sender, _tokenInmueble, _cantidadTokens);
    }

    /// @dev FUNCIÓN 4: El administrador actualiza el precio del token según el mercado real
    function modificarPrecio(address _tokenInmueble, uint256 _nuevoPrecio) public {
        require(msg.sender == administrador, "Solo el administrador puede cambiar el precio");
        
        DetallesInmueble storage inmueble = inmuebles[_tokenInmueble];
        require(inmueble.direccionContrato != address(0), "El inmueble no existe");

        inmueble.precioPorToken = _nuevoPrecio;

        emit PrecioModificado(_tokenInmueble, inmueble.precioPorToken, _nuevoPrecio);
    }
}