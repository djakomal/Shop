-- ╔══════════════════════════════════════════════════════════════╗
-- ║         INITIALISATION BASE DE DONNÉES MySQL                 ║
-- ║         Boutique Alimentaire                                 ║
-- ║   Exécuter UNE SEULE FOIS avant le premier démarrage        ║
-- ║   Usage : mysql -u root -p < scripts/init-db.sql            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Créer la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS boutique_alimentaire
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Sélectionner la base de données
USE boutique_alimentaire;

-- Vérification
SELECT 'Base de données boutique_alimentaire créée avec succès !' AS message;
