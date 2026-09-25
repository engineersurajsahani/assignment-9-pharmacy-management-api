function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function saveLogin(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function callApi(path, method, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`/api${path}`, {
    method: method || "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then((response) => response.json().then((data) => ({ response, data })));
}

function showError(text) {
  Swal.fire({ icon: "error", title: "Oops...", text });
}

function showSuccess(text) {
  return Swal.fire({ icon: "success", title: "Success", text });
}

function rupees(value) {
  return `Rs. ${Number(value).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function isStaff(user) {
  return user && (user.role === "pharmacist" || user.role === "admin");
}

function handleUnauthorized(response, data) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    Swal.fire({ icon: "error", title: "Oops...", text: data.message }).then(() => {
      location.href = "login.html";
    });
    return true;
  }
  return false;
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("cart");
  location.href = "index.html";
}

function requireRole(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    Swal.fire({ icon: "error", title: "Oops...", text: "you are not allowed on this page!" }).then(
      () => {
        location.href = "index.html";
      },
    );
    return null;
  }
  return user;
}

function renderNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const user = getUser();
  const home = `<button onclick="location.href='index.html'">MEDICINES</button>`;

  if (!user) {
    nav.innerHTML = `${home}
      <button onclick="location.href='login.html'">LOGIN</button>
      <button onclick="location.href='register.html'">REGISTER</button>
      <button onclick="location.href='register-staff.html'">STAFF REGISTER</button>`;
    return;
  }

  let links = home;
  if (user.role === "customer") {
    links += `<button onclick="location.href='cart.html'">CART (${getCart().length})</button>
      <button onclick="location.href='my-orders.html'">MY ORDERS</button>`;
  } else {
    links += `<button onclick="location.href='medicine-form.html'">ADD MEDICINE</button>
      <button onclick="location.href='orders.html'">ORDERS</button>
      <button onclick="location.href='reports.html'">REPORTS</button>`;
  }
  links += `<button onclick="handleLogout()">LOGOUT</button>`;
  nav.innerHTML = links;

  const who = document.createElement("span");
  who.textContent = ` logged in as ${user.name} (${user.role})`;
  nav.appendChild(who);
}

function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderNav();
}

function makeButton(label, onClick, disabled) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = onClick;
  if (disabled) button.disabled = true;
  return button;
}

function addCells(tr, values) {
  values.forEach((value) => {
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
  });
}

function runAction(path, method, body, successText, after) {
  callApi(path, method, body)
    .then(({ response, data }) => {
      if (handleUnauthorized(response, data)) return;
      if (response.status === 200) {
        showSuccess(successText);
        after();
      } else {
        showError(data.message || "Something went wrong!");
      }
    })
    .catch((error) => {
      console.log(error);
      showError("could not reach the server!");
    });
}
