/**
 * Haqiqiy "Магнит / GrandTrade" xati (2026-08-11, GT-769931).
 *
 * Bu ham zakaz xati, LEKIN zakaz jadvali xat tanasida emas — u PDF/Excel
 * ilovada keladi. Xat tanasidagi jadvallar faqat ko'rsatma/manzil uchun
 * (layout jadvallari, colspan bilan).
 *
 * Bot bunday xatda JIM turishi kerak: zakaz jadvali topilmadi.
 */
export const MAGNIT_EMAIL_HTML = `
<HTML><BODY><div><div class="WordSection1_mr_css_attr">
  <p>Добрый день!</p>
  <p>Новые заказы, адреса ТО, РЦ и макет стикера во вложении.</p>
  <p>ВАЖНО! Если доставка заказа будет осуществляться на несколько РЦ или в разные
     плановые даты, то для каждого РЦ должны быть выпущены индивидуальные CMR и инвойс.</p>

  <table style="border-collapse:collapse" border="1"><tbody>
    <tr style="height:15.0pt"><td width="623" valign="top">
      <p><span>Место ТО:</span><span> </span><span>Оренбург</span></p>
    </td></tr>
  </tbody></table>

  <table width="646" cellspacing="3" border="0"><tbody>
    <tr>
      <td colspan="21"><p>По заказам, <b><u>с выгрузкой</u></b>
        <b>РЦ ГТ ПроФреш Санкт-Петербург</b>. <b><u>(условия поставки DAP Санкт-Петербург)</u></b>,
        в связи с возможным перенаправлением в пути в 3 графе CMR просьба
        <b><u>указывать 3 адреса выгрузки:</u></b></p></td>
      <td><p>&nbsp;</p></td>
      <td><p>&nbsp;</p></td>
    </tr>
    <tr>
      <td colspan="16"><p>∙ <b>РЦ ГТ ПроФреш Санкт-Петербург</b>. - 196626, Российская
        Федерация, Ленинградская область, Санкт-Петербург г, Московское ш, дом № 177А стр 2</p></td>
      <td><p>&nbsp;</p></td>
    </tr>
    <tr>
      <td colspan="23"><p>∙ Склад ГТ РЦ ФРОВ ПФ СПБ - ООО ПроФреш-Север,
        ИНН/КПП: 7817130722/781701001 г. Санкт-Петербург, улица Софийская, д. 118, кор. 3, стр.1</p></td>
    </tr>
  </tbody></table>

  <table style="border-collapse:collapse" border="1"><tbody>
    <tr><td width="623" valign="top"><p><span>Контакты СК ниже:</span></p></td></tr>
  </tbody></table>

  <p><b>Требования к оформлению стикеров/товара:</b></p>
  <ol><li>На каждую поставку необходимо высылать заполненный макет стикера.</li>
      <li>Стикер должен быть полностью оформлен на русском языке;</li></ol>
</div></div></BODY></HTML>`;
