// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importamos el estándar ERC-20 de OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ContratoInmueble is ERC20 {
    
    // Variables públicas para guardar los datos del mundo real
    string public direccionInmueble;
    string public ipfsDocumentoUrl; // CID del PDF de la escritura
    string public ipfsImagenUrl; // CID de la imagen del inmueble

    /**
     * @dev Constructor que se ejecuta UNA SOLA VEZ al crear el contrato
     */
    constructor(
        string memory _nombre,          // Ej: "Piso Elche Altabix"
        string memory _simbolo,         // Ej: "EAX"
        uint256 _cantidadTotalTokens,   // Ej: 100000 (partes en las que dividimos la casa)
        string memory _direccion,       // Ej: "Calle Sixto Marco 1, Número 2, Planta 3, Puerta 4"
        string memory _ipfsUrl,         // Ej: "ipfs://QmTuY..." (El hash del PDF)
        string memory _ipfsImagenUrl,    // Ej: "ipfs://QmTuY..." (El hash de la imagen)
        address _mercado                // La dirección del contrato general que gestionará las ventas
    ) ERC20(_nombre, _simbolo) {

        direccionInmueble = _direccion;
        ipfsDocumentoUrl = _ipfsUrl;
        ipfsImagenUrl = _ipfsImagenUrl;
        
        // Creamos todos los tokens y se los damos al contrato general (Mercado)
        // Se multiplica por 10**decimals() porque blockchain no entiende de decimales reales
        _mint(_mercado, _cantidadTotalTokens * 10 ** decimals());
    }
}