document.addEventListener("DOMContentLoaded", function () {
    const categories = document.querySelectorAll(".category");
    const modals = document.querySelectorAll(".modal");
    const closeButtons = document.querySelectorAll(".close");
    const fashionItems = document.querySelectorAll(".fashion-item");
    const fashionModal = document.getElementById("modal-fashion");
    const checkoutModal = document.getElementById("modal-checkout");
    const editOrderModal = document.getElementById("modal-edit-order");
    const compareModal = document.getElementById("modal-compare"); // Модальное окно для сравнения
    const cart = [];
    const cartItemsContainer = document.getElementById("cart-items");
    const orderHistoryContainer = document.getElementById("order-history-items");
    const compareList = []; // Список для сравнения
    let editOrderId = null;
    let selectedCurrency = 'UZS'; // Начальная валюта

    const currencySelect = document.getElementById("currency-select");

    // Конвертационные курсы
    const exchangeRates = {
        'UZS': 1,
        'USD': 11000 // Примерный курс, актуализируйте при необходимости
    };

    // Загрузка данных из localStorage при загрузке страницы
    loadCart();
    loadOrderHistory();
    loadCompareList();
    initializeSmartDate();

    // Обработчик изменения валюты
    currencySelect.addEventListener("change", function () {
        selectedCurrency = this.value;
        updateAllPrices();
    });

    // Открытие модальных окон для категорий
    categories.forEach(category => {
        category.addEventListener("click", function () {
            const categoryType = category.getAttribute("data-category");
            const modal = document.getElementById(`modal-${categoryType}`);
            if (modal) {
                modal.style.display = "flex";
            }
        });
    });

    // Закрытие модальных окон
    closeButtons.forEach(button => {
        button.addEventListener("click", function () {
            modals.forEach(modal => {
                modal.style.display = "none";
            });
        });
    });

    // Закрытие модальных окон при клике вне контента
    window.addEventListener("click", function (event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    });

    // Открытие модального окна фасона с опциями
    fashionItems.forEach(item => {
        item.addEventListener("click", function () {
            const fashionName = item.querySelector("p").innerText;
            const fashionImageSrc = item.querySelector("img").getAttribute("src");
            const fashionPrice = parseFloat(item.getAttribute("data-price")); // Цена в UZS

            document.getElementById("fashion-name").innerText = fashionName;
            document.getElementById("fashion-image").setAttribute("src", fashionImageSrc);
            document.getElementById("fashion-price").innerText = formatPrice(fashionPrice);
            fashionModal.style.display = "flex";
        });
    });

    // Добавление товара в корзину
    document.getElementById("order-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const size = document.getElementById("size").value;
        const color = document.getElementById("color").value;
        const quantity = parseInt(document.getElementById("quantity").value);
        const notes = document.getElementById("notes").value;
        const deliveryDate = document.getElementById("delivery-date").value;
        const fashionName = document.getElementById("fashion-name").innerText;
        const fashionImage = document.getElementById("fashion-image").getAttribute("src");
        const fashionPriceText = document.getElementById("fashion-price").innerText;
        const fashionPrice = parseFloat(fashionPriceText.replace(/[^0-9.]/g, ""));

        const cartItem = {
            id: Date.now(), // Уникальный ID для каждого товара
            name: fashionName,
            size: size,
            color: color,
            quantity: quantity,
            notes: notes,
            image: fashionImage,
            price: fashionPrice,
            deliveryDate: deliveryDate
        };

        cart.push(cartItem);
        updateCart();
        fashionModal.style.display = "none";
    });

    // Обновление корзины
    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let totalPrice = 0;
        cart.forEach((item, index) => {
            const cartItemElement = document.createElement("div");
            cartItemElement.classList.add("cart-item");
            cartItemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <p><strong>${item.name}</strong></p>
                    <p>Размер: ${item.size}</p>
                    <p>Цвет: ${item.color}</p>
                    <p>Количество: ${item.quantity}</p>
                    <p>Заметки: ${item.notes}</p>
                    <p>Дата доставки: ${formatDate(item.deliveryDate)}</p>
                    <p class="price" data-price="${item.price}">${formatPrice(item.price)}</p>
                    <p class="total-price" data-total="${item.price * item.quantity}"><strong>Итого: ${formatPrice(item.price * item.quantity)}</strong></p>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemElement);
            totalPrice += item.price * item.quantity;
        });

        // Добавление общего итога
        if (cart.length > 0) {
            const totalElement = document.createElement("div");
            totalElement.classList.add("cart-total");
            totalElement.innerHTML = `<p><strong>Общая сумма: ${formatPrice(totalPrice)}</strong></p>`;
            cartItemsContainer.appendChild(totalElement);
        }

        saveCart();
    }

    // Оформление заказа и открытие модального окна для данных клиента
    document.getElementById("checkout").addEventListener("click", function () {
        if (cart.length === 0) {
            alert("Ваша корзина пуста!");
            return;
        }
        checkoutModal.style.display = "flex";
    });

    // Подтверждение заказа и добавление в историю
    document.getElementById("checkout-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const customerName = document.getElementById("customer-name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const company = document.getElementById("company").value.trim();

        if (customerName === "" || phone === "" || company === "") {
            alert("Пожалуйста, заполните все поля.");
            return;
        }

        const order = {
            id: Date.now(), // Уникальный ID для каждого заказа
            customerName: customerName,
            phone: phone,
            company: company,
            items: [...cart] // Копируем текущую корзину
        };

        addOrder(order);
        cart.length = 0; // Очищаем корзину после оформления заказа
        updateCart();
        checkoutModal.style.display = "none";
    });

    // Добавление заказа в историю и сохранение в localStorage
    function addOrder(order) {
        const orders = getOrders();
        orders.unshift(order); // Добавляем заказ в начало списка
        localStorage.setItem('orders', JSON.stringify(orders));
        displayOrder(order);
    }

    // Отображение заказа в истории
    function displayOrder(order) {
        // Проверка наличия items массива
        if (!order.items || !Array.isArray(order.items)) {
            console.error("Order items are undefined or not an array:", order);
            return;
        }

        // Вычисление оставшихся дней до дедлайна
        const today = new Date();
        const deliveryDate = new Date(order.items[0].deliveryDate);
        const timeDiff = deliveryDate - today;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Определение класса для цвета уведомления
        let deadlineClass = '';
        if (daysRemaining > 20) {
            deadlineClass = 'deadline-green';
        } else if (daysRemaining > 10) {
            deadlineClass = 'deadline-yellow';
        } else if (daysRemaining > 5) {
            deadlineClass = 'deadline-orange';
        } else {
            deadlineClass = 'deadline-red';
        }

        const orderElement = document.createElement("div");
        orderElement.classList.add("order-item", deadlineClass);
        orderElement.setAttribute("data-order-id", order.id);
        orderElement.innerHTML = `
            <h3>Заказ от ${order.customerName} (${formatDate(order.items[0].deliveryDate)})</h3>
            <p><strong>Телефон:</strong> ${order.phone}</p>
            <p><strong>Компания:</strong> ${order.company}</p>
            <div class="order-items-list">
                ${order.items.map(item => `
                    <div class="order-item-details">
                        <img src="${item.image}" alt="${item.name}">
                        <div>
                            <p><strong>${item.name}</strong></p>
                            <p>Размер: ${item.size}</p>
                            <p>Цвет: ${item.color}</p>
                            <p>Количество: ${item.quantity}</p>
                            <p>Заметки: ${item.notes}</p>
                            <p class="price" data-price="${item.price}">Цена за единицу: ${formatPrice(item.price)}</p>
                            <p class="total-price" data-total="${item.price * item.quantity}"><strong>Итого: ${formatPrice(item.price * item.quantity)}</strong></p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-item-actions">
                <button class="edit-btn">Редактировать</button>
                <button class="delete-btn">Удалить</button>
                <button class="compare-btn">Сравнить</button>
            </div>
            <hr>
        `;
        orderHistoryContainer.appendChild(orderElement);

        // Добавляем обработчики для кнопок редактирования, удаления и сравнения
        const editButton = orderElement.querySelector(".edit-btn");
        const deleteButton = orderElement.querySelector(".delete-btn");
        const compareButton = orderElement.querySelector(".compare-btn");

        editButton.addEventListener("click", function () {
            openEditOrderModal(order.id);
        });

        deleteButton.addEventListener("click", function () {
            deleteOrder(order.id);
        });

        compareButton.addEventListener("click", function () {
            toggleCompare(order.id, compareButton);
        });
    }

    // Получение списка заказов из localStorage
    function getOrders() {
        const storedOrders = localStorage.getItem('orders');
        return storedOrders ? JSON.parse(storedOrders) : [];
    }

    // Загрузка истории заказов из localStorage
    function loadOrderHistory() {
        const orders = getOrders();
        // Сортировка заказов по дате оформления (последние сверху)
        orders.sort((a, b) => b.id - a.id);
        orders.forEach(order => {
            displayOrder(order);
        });
    }

    // Сохранение корзины в localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Загрузка корзины из localStorage
    function loadCart() {
        const storedCart = JSON.parse(localStorage.getItem('cart'));
        if (storedCart && Array.isArray(storedCart)) {
            storedCart.forEach(item => cart.push(item));
            updateCart();
        }
    }

    // Удаление заказа
    function deleteOrder(orderId) {
        let orders = getOrders();
        orders = orders.filter(order => order.id !== orderId);
        localStorage.setItem('orders', JSON.stringify(orders));
        const orderElement = orderHistoryContainer.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderHistoryContainer.removeChild(orderElement);
        }
        // Удаление из списка сравнения, если присутствует
        const compareIndex = compareList.indexOf(orderId);
        if (compareIndex !== -1) {
            compareList.splice(compareIndex, 1);
            updateCompareList();
        }
    }

    // Открытие модального окна для редактирования заказа
    function openEditOrderModal(orderId) {
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        editOrderId = orderId;

        // Заполнение полей формы редактирования заказа
        document.getElementById("edit-customer-name").value = order.customerName;
        document.getElementById("edit-phone").value = order.phone;
        document.getElementById("edit-company").value = order.company;

        editOrderModal.style.display = "flex";
    }

    // Подтверждение редактирования заказа и обновление localStorage
    document.getElementById("edit-order-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const customerName = document.getElementById("edit-customer-name").value.trim();
        const phone = document.getElementById("edit-phone").value.trim();
        const company = document.getElementById("edit-company").value.trim();

        if (customerName === "" || phone === "" || company === "") {
            alert("Пожалуйста, заполните все поля.");
            return;
        }

        const orderId = editOrderId;
        let orders = getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return;

        orders[orderIndex].customerName = customerName;
        orders[orderIndex].phone = phone;
        orders[orderIndex].company = company;

        localStorage.setItem('orders', JSON.stringify(orders));

        // Обновление отображения заказа
        const orderElement = orderHistoryContainer.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.querySelector("h3").innerText = `Заказ от ${customerName} (${formatDate(orders[orderIndex].items[0].deliveryDate)})`;
            const paragraphs = orderElement.querySelectorAll("p");
            paragraphs[0].innerHTML = `<strong>Телефон:</strong> ${phone}`;
            paragraphs[1].innerHTML = `<strong>Компания:</strong> ${company}`;
        }

        editOrderModal.style.display = "none";
        editOrderId = null;
    });

    // Закрытие модального окна редактирования заказа
    document.querySelector("#modal-edit-order .close").addEventListener("click", function () {
        editOrderModal.style.display = "none";
        editOrderId = null;
    });

    // Функция для добавления или удаления заказа из списка сравнения
    function toggleCompare(orderId, button) {
        const index = compareList.indexOf(orderId);
        if (index === -1) {
            if (compareList.length >= 3) { // Ограничение на 3 заказа для сравнения
                alert("Вы можете сравнить максимум 3 заказа.");
                return;
            }
            compareList.push(orderId);
            button.innerText = "Убрать из сравнения";
            alert("Заказ добавлен в список сравнения.");
        } else {
            compareList.splice(index, 1);
            button.innerText = "Сравнить";
            alert("Заказ удален из списка сравнения.");
        }
        updateCompareList();
    }

    // Функция для обновления списка сравнения и сохранения в localStorage
    function updateCompareList() {
        localStorage.setItem('compareList', JSON.stringify(compareList));
    }

    // Загрузка списка сравнения из localStorage
    function loadCompareList() {
        const storedCompareList = JSON.parse(localStorage.getItem('compareList'));
        if (storedCompareList && Array.isArray(storedCompareList)) {
            storedCompareList.forEach(orderId => {
                if (!compareList.includes(orderId)) {
                    compareList.push(orderId);
                }
            });
        }
    }

    // Обработчик кнопки "Сравнить выбранные"
    document.getElementById("compare-selected").addEventListener("click", function () {
        if (compareList.length === 0) {
            alert("Выберите заказы для сравнения.");
            return;
        }
        displayCompareList();
        compareModal.style.display = "flex";
    });

    // Отображение списка сравнения в модальном окне
    function displayCompareList() {
        const compareItemsContainer = document.getElementById("compare-list");
        compareItemsContainer.innerHTML = "";
        let totalComparePrice = 0;

        compareList.forEach(orderId => {
            const order = getOrders().find(o => o.id === orderId);
            if (order && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const compareItemElement = document.createElement("div");
                    compareItemElement.classList.add("compare-item");
                    compareItemElement.innerHTML = `
                        <img src="${item.image}" alt="${item.name}">
                        <div>
                            <p><strong>${item.name}</strong></p>
                            <p>Размер: ${item.size}</p>
                            <p>Цвет: ${item.color}</p>
                            <p>Количество: ${item.quantity}</p>
                            <p>Заметки: ${item.notes}</p>
                            <p class="price" data-price="${item.price}">Цена за единицу: ${formatPrice(item.price)}</p>
                            <p class="total-price" data-total="${item.price * item.quantity}"><strong>Итого: ${formatPrice(item.price * item.quantity)}</strong></p>
                        </div>
                    `;
                    compareItemsContainer.appendChild(compareItemElement);
                    totalComparePrice += item.price * item.quantity;
                });
            }
        });

        // Добавление общего итога сравнения
        if (compareList.length > 0) {
            const totalElement = document.createElement("div");
            totalElement.classList.add("compare-total");
            totalElement.innerHTML = `<p><strong>Общая сумма сравнения: ${formatPrice(totalComparePrice)}</strong></p>`;
            compareItemsContainer.appendChild(totalElement);
        }
    }

    // Закрытие модального окна сравнения
    document.querySelector("#modal-compare .close").addEventListener("click", function () {
        compareModal.style.display = "none";
    });

    // Очистка списка сравнения после закрытия модального окна
    compareModal.addEventListener("click", function (event) {
        if (event.target === compareModal) {
            compareModal.style.display = "none";
        }
    });

    // Инициализация умной даты в форме заказа
    function initializeSmartDate() {
        const deliveryDateInput = document.getElementById("delivery-date");
        const today = new Date();
        const minDate = new Date(today.setDate(today.getDate() + 20));
        const yyyy = minDate.getFullYear();
        const mm = String(minDate.getMonth() + 1).padStart(2, '0');
        const dd = String(minDate.getDate()).padStart(2, '0');
        const minDateStr = `${yyyy}-${mm}-${dd}`;
        deliveryDateInput.setAttribute("min", minDateStr);
        deliveryDateInput.value = minDateStr;
    }

    // Форматирование даты в удобный вид
    function formatDate(dateStr) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', options);
    }

    // Форматирование цены в выбранной валюте
    function formatPrice(priceInUZS) {
        if (selectedCurrency === 'UZS') {
            return `Цена: ${priceInUZS.toLocaleString('ru-RU')} UZS`;
        } else if (selectedCurrency === 'USD') {
            const priceInUSD = priceInUZS / exchangeRates['USD'];
            return `Цена: $${priceInUSD.toFixed(2)}`;
        }
    }

    // Обновление всех цен на странице при смене валюты
    function updateAllPrices() {
        // Обновление цен в модальных окнах фасонов
        document.querySelectorAll(".price").forEach(priceElement => {
            const priceInUZS = parseFloat(priceElement.getAttribute("data-price"));
            priceElement.innerText = formatPrice(priceInUZS);
        });

        // Обновление цен в корзине
        document.querySelectorAll(".cart-item .price").forEach(priceElement => {
            const priceInUZS = parseFloat(priceElement.getAttribute("data-price"));
            priceElement.innerText = formatPrice(priceInUZS);
        });

        document.querySelectorAll(".cart-item .total-price").forEach(totalPriceElement => {
            const totalInUZS = parseFloat(totalPriceElement.getAttribute("data-total"));
            totalPriceElement.innerText = formatPrice(totalInUZS);
        });

        // Обновление цен в истории заказов
        document.querySelectorAll(".order-item .order-item-details .price").forEach(priceElement => {
            const priceInUZS = parseFloat(priceElement.getAttribute("data-price"));
            priceElement.innerText = formatPrice(priceInUZS);
        });

        document.querySelectorAll(".order-item .order-item-details .total-price").forEach(totalPriceElement => {
            const totalInUZS = parseFloat(totalPriceElement.getAttribute("data-total"));
            totalPriceElement.innerText = formatPrice(totalInUZS);
        });

        // Обновление цен в списке сравнения
        document.querySelectorAll(".compare-item .price").forEach(priceElement => {
            const priceInUZS = parseFloat(priceElement.getAttribute("data-price"));
            priceElement.innerText = formatPrice(priceInUZS);
        });

        document.querySelectorAll(".compare-item .total-price").forEach(totalPriceElement => {
            const totalInUZS = parseFloat(totalPriceElement.getAttribute("data-total"));
            totalPriceElement.innerText = formatPrice(totalInUZS);
        });
    }

    // Функция для сохранения списка сравнения в localStorage
    function saveCompareList() {
        localStorage.setItem('compareList', JSON.stringify(compareList));
    }

    // Функция для загрузки списка сравнения из localStorage
    function loadCompareList() {
        const storedCompareList = JSON.parse(localStorage.getItem('compareList'));
        if (storedCompareList && Array.isArray(storedCompareList)) {
            storedCompareList.forEach(orderId => {
                if (!compareList.includes(orderId)) {
                    compareList.push(orderId);
                }
            });
        }
    }
});
