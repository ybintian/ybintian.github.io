// order.js
function calculateOrder() {
    let totalPrepTime = 0;
    let totalCookTime = 0;
    let totalPrice = 0;

    // 获取所有选中的菜肴
    const items = document.querySelectorAll('input[type="checkbox"]:checked');

    // 遍历选中的菜肴，累加价格、准备时间和烹饪时间
    items.forEach(item => {
        totalPrepTime += parseInt(item.getAttribute('data-prep-time'));
        totalCookTime += parseInt(item.getAttribute('data-cook-time'));
        totalPrice += parseInt(item.getAttribute('data-price'));
    });

    // 更新页面上的总时间和总价格
    document.getElementById('total-prep-time').innerText = `准备时间: ${totalPrepTime} 分钟`;
    document.getElementById('total-cook-time').innerText = `烹饪时间: ${totalCookTime} 分钟`;
    document.getElementById('total-price').innerText = `总价格: ¥${totalPrice}`;
}
