-- Criação do Banco de Dados
CREATE DATABASE CadastroDB;
GO

USE CadastroDB;
GO

-- Criação da Tabela de Usuários
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    NomeCompleto NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    SenhaHash NVARCHAR(MAX) NOT NULL,
    DataCriacao DATETIME DEFAULT GETDATE(),
    Ativo BIT DEFAULT 1
);
GO

-- Criação da Stored Procedure para Inserir Novos Usuários
CREATE PROCEDURE sp_InserirUsuario
    @NomeCompleto NVARCHAR(255),
    @Email NVARCHAR(255),
    @SenhaHash NVARCHAR(MAX)
AS
BEGIN
    -- Evita o envio de mensagens de contagem de linhas (melhora a performance)
    SET NOCOUNT ON;

    -- Verifica se já existe um usuário cadastrado com este e-mail
    IF EXISTS (SELECT 1 FROM Usuarios WHERE Email = @Email)
    BEGIN
        -- Lança um erro caso o e-mail seja duplicado
        RAISERROR ('Erro: O e-mail informado já está cadastrado.', 16, 1);
        RETURN;
    END

    -- Insere o novo usuário
    INSERT INTO Usuarios (NomeCompleto, Email, SenhaHash)
    VALUES (@NomeCompleto, @Email, @SenhaHash);
    
    -- Opcional: retornar o ID do usuário inserido
    -- SELECT SCOPE_IDENTITY() AS NovoUsuarioId;
END
GO
