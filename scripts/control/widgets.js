
export function createButton(parent, func = () => { console.log("Pressed"); }, name = "Name") {
    const element_base = document.createElement("div");
    element_base.className = "button";
    element_base.innerHTML = name;
    element_base.addEventListener("click", func);

    parent.appendChild(element_base);
    return element_base;
}

export function createToggle(parent, func = (bool) => { console.log(bool); }, name = "Name", def = false) {
    const element_handle = document.createElement("div");
    const element_bool = document.createElement("div");
    element_bool.className = "boolean";
    if (def)
        element_bool.setAttribute("value", "true");
    else
        element_bool.setAttribute("value", "false");
    element_bool.appendChild(element_handle);
    element_bool.addEventListener("click", function() {
        if (this.getAttribute("value") == "false") {
            func(true);
            this.setAttribute("value", "true");
        }
        else {
            func(false);
            this.setAttribute("value", "false");
        }
    });   

    const element_text = document.createElement("p");
    element_text.innerText = name;

    const element_base = document.createElement("div");
    element_base.className = "toggle";
    element_base.appendChild(element_bool);
    element_base.appendChild(element_text);
    
    parent.appendChild(element_base);
    func(def);  
    return element_base;
}

export function createSlider(parent, func = (value) => { console.log(value); }, name = "Name", def = 0, min = 0, max = 1) {
    def = resizeNumber(Math.max(Math.min(def, max), min));

    const element_text = document.createElement("input");
    element_text.setAttribute("type", "text");
    element_text.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text.setAttribute("required", "");
    element_text.setAttribute("value", def);

    const element_range = document.createElement("input");
    element_range.setAttribute("type", "range");
    element_range.setAttribute("value", "1");
    element_range.setAttribute("min", "0");
    element_range.setAttribute("max", "100");
    element_range.setAttribute("step", "1");
    element_range.setAttribute("value", ((def - min) / (max - min)) * 100);

    element_text.addEventListener("focusout", function() {
        if (this.checkValidity()) {
            const temp = resizeNumber(Math.min(Math.max(parseFloat(this.value), min), max));
            this.value = temp;
            element_range.value = ((temp - min) / (max - min)) * 100;
            func(real_value);
        } else {
            this.value = def;
            element_range.value = ((def - min) / (max - min)) * 100;
            func(def);
        }
    });

    element_range.addEventListener("input", function() {
        const factor = parseInt(this.value) / 100;
        const temp = resizeNumber((min + factor * (max - min)));
        element_text.value = temp;
        func(temp);
    });

    const element_name = document.createElement("p");
    element_name.innerText = name;

    const element_base = document.createElement("div");
    element_base.className = "slider";
    element_base.appendChild(element_text);
    element_base.appendChild(element_range);
    element_base.appendChild(element_name);
    
    parent.appendChild(element_base);
    func(def);
    return element_base;
}

export function createIncrement(parent, func = (value) => {console.log(value);}, name = "Name", def = 0, min = -Infinity, max = Infinity, step = 1, multiply = false) {
    def = resizeNumber(Math.max(Math.min(def, max), min));

    const element_text = document.createElement("input");
    element_text.setAttribute("type", "text");
    element_text.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text.setAttribute("required", "");
    element_text.setAttribute("value", def);

    const element_plus = document.createElement("i");
    element_plus.className = "fa fa-plus";

    const element_increment = document.createElement("div");
    element_increment.className = "button round";
    element_increment.appendChild(element_plus);

    const element_minus = document.createElement("i");
    element_minus.className = "fa fa-minus";

    const element_decrement = document.createElement("div");
    element_decrement.className = "button round";
    element_decrement.appendChild(element_minus);

    const element_name = document.createElement("p");
    element_name.innerText = name;

    const element_base = document.createElement("div");
    element_base.appendChild(element_text);
    element_base.appendChild(element_increment);
    element_base.appendChild(element_decrement);
    element_base.appendChild(element_name);
    element_base.className = "incrementer";

    element_text.addEventListener("focusout", function() {
        if (this.checkValidity()) {
            const value = resizeNumber(Math.min(Math.max(parseFloat(this.value), min), max));
            this.value = value;
            func(value);
        } else {
            this.value = def;
            func(def);
        }
    });

    element_increment.addEventListener("click", function() {
        const temp = multiply ? parseFloat(element_text.value) * step : parseFloat(element_text.value) + step;
        const value = resizeNumber(Math.min(Math.max(temp, min), max));
        element_text.value = value;
        func(value);
    });

    element_decrement.addEventListener("click", function() {
        const temp = multiply ? parseFloat(element_text.value) / step : parseFloat(element_text.value) - step;
        const value = resizeNumber(Math.min(Math.max(temp, min), max));
        element_text.value = value;
        func(value);
    });
    
    parent.appendChild(element_base);
    func(def);
    return element_base;
}

export function createColor(parent, func = (value) => {console.log(value);}, name = "Name", def = "#ffffffff", hex = false) {
    const element_color = document.createElement("input");
    element_color.setAttribute("type", "color");
    element_color.setAttribute("value", def);

    const element_name = document.createElement("p");
    element_name.innerText = name;

    const element_base = document.createElement("div");
    element_base.className = "color";
    element_base.appendChild(element_color);
    element_base.appendChild(element_name);

    element_color.addEventListener("input", function() {
        func(hex ? this.value : hex2rgb(this.value));
    });
    
    parent.appendChild(element_base);
    func(def);
    return element_base;
}

export function createDrag(parent, func = (value) => {console.log(value);}, name = "Name", def = 0.0, min = -Infinity, max = Infinity, sen = 0.01) {
    def = resizeNumber(Math.max(Math.min(def,  max), min));

    const element_text = document.createElement("input");
    element_text.setAttribute("type", "text");
    element_text.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text.setAttribute("required", "");
    element_text.setAttribute("value", def);

    const element_left = document.createElement("i");
    element_left.className = "fa fa-sort-desc fa-rotate-90";

    const element_right = document.createElement("i");
    element_right.className = "fa fa-sort-asc fa-rotate-90";

    const element_button = document.createElement("div");
    element_button.className = "button";
    element_button.appendChild(element_left);
    element_button.appendChild(element_right);

    const element_name = document.createElement("p");
    element_name.innerText = name;

    const element_base = document.createElement("div");
    element_base.appendChild(element_text);
    element_base.appendChild(element_button);
    element_base.appendChild(element_name);
    element_base.className = "drag";

    element_text.addEventListener("focusout", function() {
        if (this.checkValidity()) {
            const value = resizeNumber(Math.min(Math.max(parseFloat(this.value), min), max));
            this.value = value;
            func(value);
        } else {
            this.value = def;
            func(def);
        }
    });

    element_button.addEventListener("mousedown", function() {
        const mousemove_listener = (event) => {
            const value = resizeNumber(Math.max(Math.min(parseFloat(parseFloat(element_text.value)) + event.movementX * sen, max), min));
            element_text.value = value;
            func(value);

            const mouseup_listener = () => {
                document.removeEventListener("mousemove", mousemove_listener);
                document.removeEventListener("mouseup", mouseup_listener);
            }
            document.addEventListener("mouseup", mouseup_listener);
        }

        document.addEventListener("mousemove", mousemove_listener);
    });
    
    parent.appendChild(element_base);
    func(def);
    return element_base;
}

export function createVector(parent, func = (value) => {console.log(value);}, name = "Name", def = {x:0, y:0, z:0}, sen = 0.01) {

    const element_text_x = document.createElement("input");
    element_text_x.setAttribute("type", "text");
    element_text_x.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text_x.setAttribute("required", "");
    element_text_x.setAttribute("value", def.x);

    const element_left_x = document.createElement("i");
    element_left_x.className = "fa fa-sort-desc fa-rotate-90";

    const element_right_x = document.createElement("i");
    element_right_x.className = "fa fa-sort-asc fa-rotate-90";

    const element_button_x = document.createElement("div");
    element_button_x.className = "button";
    element_button_x.appendChild(element_left_x);
    element_button_x.appendChild(element_right_x);

    const element_name_x = document.createElement("p");
    element_name_x.innerText = "X";

    const element_drag_x = document.createElement("div");
    element_drag_x.className = "drag";
    element_drag_x.appendChild(element_text_x);
    element_drag_x.appendChild(element_button_x);
    element_drag_x.appendChild(element_name_x);



    const element_text_y = document.createElement("input");
    element_text_y.setAttribute("type", "text");
    element_text_y.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text_y.setAttribute("required", "");
    element_text_y.setAttribute("value", def.y);

    const element_left_y = document.createElement("i");
    element_left_y.className = "fa fa-sort-desc fa-rotate-90";

    const element_right_y = document.createElement("i");
    element_right_y.className = "fa fa-sort-asc fa-rotate-90";

    const element_button_y = document.createElement("div");
    element_button_y.className = "button";
    element_button_y.appendChild(element_left_y);
    element_button_y.appendChild(element_right_y);

    const element_name_y = document.createElement("p");
    element_name_y.innerText = "Y";

    const element_drag_y = document.createElement("div");
    element_drag_y.className = "drag";
    element_drag_y.appendChild(element_text_y);
    element_drag_y.appendChild(element_button_y);
    element_drag_y.appendChild(element_name_y);

    

    const element_text_z = document.createElement("input");
    element_text_z.setAttribute("type", "text");
    element_text_z.setAttribute("pattern", '-?([0-9]+)(.[0-9]+)?');
    element_text_z.setAttribute("required", "");
    element_text_z.setAttribute("value", def.z);

    const element_left_z = document.createElement("i");
    element_left_z.className = "fa fa-sort-desc fa-rotate-90";

    const element_right_z = document.createElement("i");
    element_right_z.className = "fa fa-sort-asc fa-rotate-90";

    const element_button_z = document.createElement("div");
    element_button_z.className = "button";
    element_button_z.appendChild(element_left_z);
    element_button_z.appendChild(element_right_z);

    const element_name_z = document.createElement("p");
    element_name_z.innerText = "Z";

    const element_drag_z = document.createElement("div");
    element_drag_z.className = "drag";
    element_drag_z.appendChild(element_text_z);
    element_drag_z.appendChild(element_button_z);
    element_drag_z.appendChild(element_name_z);


    element_button_x.addEventListener("mousedown", function() {
        const mousemove_listener = (event) => {
            const value = resizeNumber(Math.max(Math.min(parseFloat(parseFloat(element_text_x.value)) + event.movementX * sen, max), min));
            element_text_x.value = value;
            func({
                x: parseFloat(value),
                y: parseFloat(element_text_y.value),
                z: parseFloat(element_text_z.value)
            });
            const mouseup_listener = () => {
                document.removeEventListener("mousemove", mousemove_listener);
                document.removeEventListener("mouseup", mouseup_listener);
            }
            document.addEventListener("mouseup", mouseup_listener);
        }
        document.addEventListener("mousemove", mousemove_listener);
    });

    element_button_y.addEventListener("mousedown", function() {
        const mousemove_listener = (event) => {
            const value = resizeNumber(Math.max(Math.min(parseFloat(parseFloat(element_text_y.value)) + event.movementX * sen, max), min));
            element_text_y.value = value;
            func({
                x: parseFloat(element_text_z.value),
                y: parseFloat(value),
                z: parseFloat(element_text_z.value)
            });
            const mouseup_listener = () => {
                document.removeEventListener("mousemove", mousemove_listener);
                document.removeEventListener("mouseup", mouseup_listener);
            }
            document.addEventListener("mouseup", mouseup_listener);
        }
        document.addEventListener("mousemove", mousemove_listener);
    });

    element_button_y.addEventListener("mousedown", function() {
        const mousemove_listener = (event) => {
            const value = resizeNumber(Math.max(Math.min(parseFloat(parseFloat(element_text_z.value)) + event.movementX * sen, max), min));
            element_text_z.value = value;
            func({
                x: parseFloat(element_text_x.value),
                y: parseFloat(element_text_y.value),
                z: parseFloat(value)
            });
            const mouseup_listener = () => {
                document.removeEventListener("mousemove", mousemove_listener);
                document.removeEventListener("mouseup", mouseup_listener);
            }
            document.addEventListener("mouseup", mouseup_listener);
        }
        document.addEventListener("mousemove", mousemove_listener);
    });


    const element_column = document.createElement("div");
    element_column.className = "column";
    element_column.appendChild(element_drag_x);
    element_column.appendChild(element_drag_y);
    element_column.appendChild(element_drag_z);

    const element_name = document.createElement("p");
    element_name.innerText = name;
 
    const element_base = document.createElement("div");
    element_base.className = "vector";
    element_base.appendChild(element_column);
    element_base.appendChild(element_name);

    parent.appendChild(element_base);
    func(def);
    return element_base;
}

export function createSwitch(parent, func = (value) => {console.log(value);}, options = ['a', 'b', 'c', 'd'], def = 'a', name) {
    const element_base = document.createElement("div");
    element_base.className = "switch";

    options.forEach((el) => {
        const element_button = createButton(element_base, function() {
            if (this.classList.contains('active')) {
                this.parentNode.childNodes.forEach((el) => {el.classList.remove("active")});
                func(null);
            } else {
                this.parentNode.childNodes.forEach((el) => {el.classList.remove("active")});
                this.classList.toggle("active");
                func(el);
            }
        }, el);
        if (el === def)
            element_button.classList.add("active");
    });

    if (name) {
        const element_name = document.createElement("p");
        element_name.innerText = name;
        element_base.appendChild(element_name);
    }

    parent.appendChild(element_base);
    func(def);
    return element_base;
}

function resizeNumber(number, size = 6) {
    const digits = number.toString().replace(".","").length;
    const decimals = number.toString().split(".")[1] ? number.toString().split(".")[1].length : 0;
    const delta = digits > size ? decimals - (digits - size) : decimals;
    return number.toFixed(delta); 
}

function hex2rgb(hex) {
    const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    const hex2float = (hex) => (digits.indexOf(hex[0]) * 16 + digits.indexOf(hex[1])) / 255.0;

    const hexes = hex.replace("#", "").split(/(?=(?:..)*$)/);

    return {
        x: hex2float(hexes[0]), 
        y: hex2float(hexes[1]), 
        z: hex2float(hexes[2])
    };
}