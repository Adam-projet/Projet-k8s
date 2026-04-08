CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL
);

INSERT INTO items (name, description) VALUES
('Produit A', 'Premier enregistrement depuis MySQL'),
('Produit B', 'Deuxième enregistrement depuis MySQL'),
('Produit C', 'Troisième enregistrement depuis MySQL');
