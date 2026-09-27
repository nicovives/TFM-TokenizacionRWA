# TFM-TokenizacionRWA

Trabajo Final de Máster: **Tokenización de Activos Financieros con Smart Contracts**. Trabajo Final del Máster en Ciencia de Datos por la Universidad de Alicante.

Autor: Nicolás Vives Vicente
Tutor: Miguel Ángel Teruel Martínez

---

Master's Thesis: Tokenization of Financial Assets with Smart Contracts. Master's Thesis for the Master's Degree in Data Science at the University of Alicante.

Author: Nicolás Vives Vicente
Supervisor: Miguel Ángel Teruel Martínez

## Resumen 

El mercado inmobiliario representa uno de los sectores con mayor volumen de capital a nivel global, pero su gestión tradicional depende de sistemas centralizados y procesos de validación manuales que limitan su eficiencia y accesibilidad. Como respuesta a estas carencias, este trabajo explora la tokenización de *Real World Assets*, un proceso que transforma activos físicos en estructuras de datos programables, inmutables y auditables mediante la tecnología *Blockchain*. El objetivo principal es democratizar la inversión en este sector, reduciendo las barreras de entrada y la iliquidez del modelo tradicional mediante el fraccionamiento de la propiedad y su registro en una base de datos distribuida. Para llevar a cabo este desarrollo, el marco teórico establece las bases de la descentralización económica, analizando la evolución desde **Bitcoin** hasta la red **Ethereum**, donde la *“Ethereum Virtual Machine”* (EVM) permite la ejecución imparcial y autónoma de acuerdos a través de ***smart contracts***. Se examinan en profundidad los estándares de tokens aplicables, prestando especial atención al ERC-20 para la fungibilidad y al ERC-3643 como marco robusto para el cumplimiento normativo de *security tokens*. Adicionalmente, el proyecto se contextualiza bajo la normativa legal vigente, destacando el impacto del Reglamento europeo MiCA y la Ley 6/2023 de los Mercados de Valores en España, fundamentales para dotar a las emisiones tokenizadas de protección al inversor y seguridad jurídica.

En la parte práctica se realiza el diseño y desarrollo de una plataforma descentralizada (*dApp*) basada en un patrón “Factory”, compuesto por un contrato “Mercado”, que gestiona los activos representados por múltiples contratos “Inmueble” (basados en OpenZeppelin ERC-20). Por último se evalúa a la plataforma mediante pruebas unitarias que validan con una tasa de éxito del 100 % el control de acceso basado en roles (RBAC) y la precisión matemática de las transacciones financieras. Paralelamente, el análisis de eficiencia demuestra que los costes operativos (*Gas*) de la compraventa son notablemente inferiores a los gastos registrales y notariales convencionales.

**Palabras clave**: Tokenización, Bitcoin, Ethereum, *Blockchain* y *Smart Contract*.

---

## Abstract

The real estate market represents one of the sectors with the highest capital volume globally, but its traditional management relies on centralized systems and manual validation processes that limit its efficiency and accessibility. In response to these shortcomings, this work explores the tokenization of *Real World Assets*, a process that transforms physical assets into programmable, immutable, and auditable data structures using *Blockchain* technology. The main objective is to democratize investment in this sector, reducing the barriers to entry and the illiquidity of the traditional model through the fractionalization of ownership and its registration in a distributed database. To carry out this development, the theoretical framework establishes the foundations of economic decentralization, analyzing the evolution from **Bitcoin** to the **Ethereum** network, where the “*Ethereum Virtual Machine*” (EVM) allows the impartial and autonomous execution of agreements through ***smart contracts***. The applicable token standards are examined in depth, paying special attention to ERC-20 for fungibility and ERC-3643 as a robust framework for the regulatory compliance of security tokens. Additionally, the project is contextualized under current legal regulations, highlighting the impact of the European MiCA Regulation and Law 6/2023 on Securities Markets in Spain, which are essential to provide tokenized issuances with investor protection and legal certainty. In the practical section, the design and development of a decentralized platform (*dApp*) based on a Factory pattern is carried out, composed of a “Mercado” (market) contract, which manages the assets represented by multiple “Inmueble” (property) contracts (based on OpenZeppelin ERC-20). Finally, the platform is evaluated through unit tests that validate with a 100 % success rate the role-based access control (RBAC) and the mathematical precision of the financial transactions. In parallel, the efficiency analysis demonstrates that the operational costs (*Gas*) of buying and selling are notably lower than conventional registry and notarial fees.

**Key words**: Tokenization, Bitcoin, Ethereum, Blockchain, and Smart Contract.

---

La aplicación descentralizada (DApp) desarrollada en este proyecto la cual permite la tokenización, fraccionamiento y compraventa de bienes raíces utilizando tecnología Blockchain y el estándar ERC-20 es accesible en el siguiente enlace:

🌐 **https://web-tokenizacion.vercel.app/**

## 📁 Estructura del Repositorio
* `/src`: Código fuente de la interfaz de usuario (React.js + ethers.js).
* `/smart-contracts`: Código fuente de los contratos inteligentes (Solidity).
* `/reports`: Documentos PDF con la memoria completa del TFM y el beamer de la presentación.

## 🛠️ Requisitos de Uso
Para interactuar con la plataforma en producción es necesario:
1. Tener instalada la extensión **MetaMask** en el navegador.
2. Estar conectado a la red de pruebas **Sepolia**.
3. Disponer de *Sepolia ETH* (obtenibles gratuitamente en cualquier *faucet* público).

---

The decentralized application (DApp) developed in this project, which allows for the tokenization, fractionalization, and trading of real estate using Blockchain technology and the ERC-20 standard, is accessible at the following link:

🌐 **[https://web-tokenizacion.vercel.app/](https://web-tokenizacion.vercel.app/?utm_source=gemini)**

## 📁 Repository Structure

* `/src`: User interface source code (React.js + ethers.js).
* `/smart-contracts`: Smart contracts source code (Solidity).
* `/reports`: PDF documents containing the complete Master's Thesis report and the presentation slides.

## 🛠️ Usage Requirements

To interact with the platform in production, you need to:

1. Have the **MetaMask** extension installed in your browser.
2. Be connected to the **Sepolia** test network.
3. Have *Sepolia ETH* (obtainable for free from any public *faucet*).
