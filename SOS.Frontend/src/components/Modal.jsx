import React, { Children } from "react";

const Modal = ({ title, onClose, children }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}>&times;</button>
                {title && <h2>{title}</h2>}
                {children}
            </div>
        </div>
    );
}
export default Modal;