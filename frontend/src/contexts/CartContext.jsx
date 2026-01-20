import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import AlertModal from "../components/ui/AlertModal";

const defaultCartValue = {
  cartItems: [],
  addProduct: () => { },
  addOffer: () => { },
  addService: () => { },
  updateQuantity: () => { },
  removeItem: () => { },
  clearCart: () => { },
  getTotal: () => 0,
  getTotalItems: () => 0,
  showAlert: () => { },
};

const CartContext = createContext(defaultCartValue);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context || context === defaultCartValue) {
    return defaultCartValue;
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("khoopper_cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error("Error al cargar carrito:", error);
    }
    return [];
  });

  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "error",
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const showAlert = useCallback((message, type = "error") => {
    setAlertState({ isOpen: true, message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState({ isOpen: false, message: "", type: "error" });
  }, []);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("khoopper_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialized]);

  const addProduct = useCallback((product, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.type === "product" && item.id === product.id
      );

      const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
      const newTotalQuantity = currentQuantityInCart + quantity;

      if (product.stock !== null && product.stock !== undefined) {
        const availableStock = parseInt(product.stock) || 0;
        if (availableStock < newTotalQuantity) {
          showAlert(
            `No hay suficiente stock disponible.\n\nStock disponible: ${availableStock}\nYa en carrito: ${currentQuantityInCart}\nIntentando agregar: ${quantity}`,
            "error"
          );
          return prevItems;
        }
      }

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id && item.type === "product"
            ? { ...item, quantity: newTotalQuantity }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            type: "product",
            id: product.id,
            name: product.name,
            price: parseFloat(product.price || 0),
            image_url: product.image_url,
            quantity,
            stock: product.stock,
          },
        ];
      }
    });
  }, [showAlert]);

  const addOffer = useCallback((offer, quantity = 1, bookingData = null) => {
    setCartItems((prevItems) => {
      const itemKey = bookingData
        ? `${offer.id}-${bookingData.date}-${bookingData.time}-${bookingData.barber?.id || 'any'}`
        : offer.id;

      const existingItem = prevItems.find(
        (item) => item.type === "offer" && item.itemKey === itemKey
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.itemKey === itemKey && item.type === "offer"
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            type: "offer",
            id: offer.id,
            itemKey,
            name: offer.name,
            price: parseFloat(offer.final_price || 0),
            original_price: offer.original_price ? parseFloat(offer.original_price) : null,
            image_url: offer.image_url,
            quantity,
            bookingData: bookingData || null,
          },
        ];
      }
    });
  }, []);

  const addService = useCallback((service, quantity = 1, bookingData = null) => {
    setCartItems((prevItems) => {
      const itemKey = bookingData
        ? `${service.id}-${bookingData.date}-${bookingData.time}-${bookingData.barber?.id || 'any'}`
        : service.id;

      const existingItem = prevItems.find(
        (item) => item.type === "service" && item.itemKey === itemKey
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.itemKey === itemKey && item.type === "service"
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            type: "service",
            id: service.id,
            itemKey,
            name: service.name,
            price: parseFloat(service.price || 0),
            image_url: service.image_url,
            quantity,
            bookingData: bookingData || null,
          },
        ];
      }
    });
  }, []);

  const removeItem = useCallback((itemId, itemType) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => {
        const currentKey = item.itemKey || item.id;
        return !(currentKey === itemId && item.type === itemType);
      })
    );
  }, []);

  const updateQuantity = useCallback((itemId, itemType, quantity) => {
    if (quantity <= 0) {
      setCartItems((prevItems) =>
        prevItems.filter((item) => {
          const currentKey = item.itemKey || item.id;
          return !(currentKey === itemId && item.type === itemType);
        })
      );
      return;
    }

    setCartItems((prevItems) => {
      const item = prevItems.find((i) => (i.itemKey || i.id) === itemId && i.type === itemType);

      if (item && itemType === "product" && item.stock !== null && item.stock !== undefined) {
        const availableStock = parseInt(item.stock) || 0;
        if (quantity > availableStock) {
          showAlert(
            `No hay suficiente stock disponible.\n\nStock disponible: ${availableStock}`,
            "error"
          );
          return prevItems;
        }
      }

      return prevItems.map((item) => {
        const currentKey = item.itemKey || item.id;
        return currentKey === itemId && item.type === itemType
          ? { ...item, quantity }
          : item;
      });
    });
  }, [showAlert]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addProduct,
    addOffer,
    addService,
    updateQuantity,
    removeItem,
    clearCart,
    getTotal,
    getTotalItems,
    showAlert,
  }), [cartItems, addProduct, addOffer, addService, updateQuantity, removeItem, clearCart, getTotal, getTotalItems, showAlert]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        message={alertState.message}
        type={alertState.type}
      />
    </CartContext.Provider>
  );
};

